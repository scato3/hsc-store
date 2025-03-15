import { State, Creator, SetState } from "../types";

// 스키마 검증 미들웨어 옵션 인터페이스
export interface SchemaOptions<T extends State> {
  schema: {
    [K in keyof T]?: {
      type?: string;
      required?: boolean;
      validate?: (value: any) => boolean;
      errorMessage?: string;
    };
  };
  onError?: (errors: Array<{ key: string; message: string }>) => void;
  strict?: boolean; // true면 오류 시 상태 변경 차단
}

// 스키마 검증 미들웨어 구현
export const schemaMiddleware = <T extends State>(
  options: SchemaOptions<T>
) => {
  return (creator: Creator<T>) => {
    return (set: SetState<T>, get: () => T) => {
      const { schema, onError, strict = false } = options;

      // 유효성 검사 함수
      const validateState = (
        state: T
      ): Array<{ key: string; message: string }> => {
        const errors: Array<{ key: string; message: string }> = [];

        Object.entries(schema).forEach(([key, rules]) => {
          const value = state[key as keyof T];

          // 필수 값 확인
          if (rules?.required && (value === undefined || value === null)) {
            errors.push({
              key,
              message: rules.errorMessage || `${key} is required`,
            });
            return;
          }

          // 타입 확인
          if (rules?.type && value !== undefined && value !== null) {
            const actualType = Array.isArray(value) ? "array" : typeof value;
            if (actualType !== rules.type) {
              errors.push({
                key,
                message:
                  rules.errorMessage ||
                  `${key} should be of type ${rules.type}, got ${actualType}`,
              });
              return;
            }
          }

          // 사용자 정의 유효성 검사
          if (rules?.validate && value !== undefined && value !== null) {
            if (!rules.validate(value)) {
              errors.push({
                key,
                message: rules.errorMessage || `${key} validation failed`,
              });
            }
          }
        });

        return errors;
      };

      // 상태 설정 함수 래핑
      const validateAndSet: SetState<T> = (payload) => {
        const nextState =
          typeof payload === "function"
            ? { ...get(), ...payload(get()) }
            : { ...get(), ...payload };

        const errors = validateState(nextState as T);

        if (errors.length > 0) {
          if (onError) onError(errors);

          // 엄격 모드면 상태 변경 차단
          if (strict) return;
        }

        // 유효하거나 비엄격 모드면 상태 변경 진행
        set(payload);
      };

      // 기본 상태 생성 및 초기 유효성 검사
      const store = creator(validateAndSet, get);

      const initialErrors = validateState(store);
      if (initialErrors.length > 0 && onError) {
        onError(initialErrors);
      }

      return {
        ...store,
        _validation: {
          validateState: () => validateState(get()),
          getSchema: () => schema,
        },
      };
    };
  };
};
