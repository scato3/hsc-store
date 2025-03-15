import { State, Creator, SetState } from "../types";

// 파생 상태 옵션 인터페이스
export interface ComputedOptions<
  T extends State,
  C extends Record<string, any>
> {
  computed: {
    [K in keyof C]: (state: T) => C[K];
  };
  dependsOn?: {
    [K in keyof C]?: Array<keyof T>;
  };
}

// 파생 상태 미들웨어 구현
export const computedMiddleware = <
  T extends State,
  C extends Record<string, any>
>(
  options: ComputedOptions<T, C>
) => {
  return (creator: Creator<T>) => {
    return (set: SetState<T>, get: () => T) => {
      const { computed, dependsOn = {} as Record<keyof C, Array<keyof T>> } =
        options;

      // 계산된 값 캐시
      const cache: Record<string, any> = {};

      // 계산된 상태가 이미 최신인지 확인하는 플래그
      const isUpToDate: Record<string, boolean> = {};

      // 의존성 추적 (키 => 의존하는 계산 속성 세트)
      const dependencies: Record<string, Set<string>> = {};

      // 모든 계산 속성의 의존성 초기화
      Object.keys(computed).forEach((computedKey) => {
        // 해당 계산 속성이 의존하는 상태 키들
        const deps = dependsOn[computedKey as keyof C] || [];

        // 각 의존성에 대해 역방향 매핑 설정
        deps.forEach((depKey: keyof T) => {
          const depKeyStr = String(depKey);
          if (!dependencies[depKeyStr]) {
            dependencies[depKeyStr] = new Set();
          }
          dependencies[depKeyStr].add(computedKey);
        });

        // 초기에는 모든 계산 값이 최신 상태가 아님
        isUpToDate[computedKey] = false;
      });

      // 계산 함수
      const compute = (key: string) => {
        if (isUpToDate[key]) return cache[key];

        cache[key] = computed[key](get());
        isUpToDate[key] = true;
        return cache[key];
      };

      // 래핑된 set 함수
      const computedSet: SetState<T> = (payload) => {
        // 변경 전 상태
        const prevState = get();

        // 상태 변경 적용
        set(payload);

        // 변경 후 상태
        const nextState = get();

        // 변경된 키 감지
        const changedKeys = new Set<string>();
        Object.keys(nextState).forEach((key) => {
          if (!Object.is(prevState[key], nextState[key])) {
            changedKeys.add(key);
          }
        });

        // 영향받는 계산 속성 찾기
        const affectedComputedKeys = new Set<string>();
        changedKeys.forEach((changedKey) => {
          // 이 키에 의존하는 계산 속성들
          const affected = dependencies[changedKey];
          if (affected) {
            affected.forEach((computedKey) => {
              affectedComputedKeys.add(computedKey);
            });
          }
        });

        // 영향받은 계산 속성 무효화
        affectedComputedKeys.forEach((key) => {
          isUpToDate[key] = false;
        });
      };

      // 기본 상태 생성
      const store = creator(computedSet, get);

      // 계산된 상태에 접근하는 프록시 생성
      const storeWithComputed = new Proxy({} as T & C, {
        get: (_, prop: string) => {
          // 원본 상태에 있는 속성
          if (prop in store) {
            return store[prop as keyof T];
          }

          // 계산된 속성
          if (prop in computed) {
            return compute(prop);
          }

          return undefined;
        },

        // 열거 가능한 속성 목록
        ownKeys: () => {
          return Object.keys(store).concat(Object.keys(computed));
        },

        // 속성 존재 여부 확인
        has: (_, prop: string) => {
          return prop in store || prop in computed;
        },

        // getOwnPropertyDescriptor를 구현하여 for...in 루프 지원
        getOwnPropertyDescriptor: (_, prop: string) => {
          if (prop in store) {
            return Object.getOwnPropertyDescriptor(store, prop);
          }

          if (prop in computed) {
            return {
              enumerable: true,
              configurable: true,
            };
          }

          return undefined;
        },
      });

      return {
        ...store,
        _computed: {
          // 계산된 상태 목록
          getComputedKeys: () => Object.keys(computed),

          // 특정 계산 값 재계산
          recompute: (key: keyof C) => {
            if (key in computed) {
              isUpToDate[key as string] = false;
              return compute(key as string);
            }
            return undefined;
          },

          // 모든 계산 값 재계산
          recomputeAll: () => {
            Object.keys(computed).forEach((key) => {
              isUpToDate[key] = false;
              compute(key);
            });
          },

          // 계산된 상태를 포함한 전체 상태 가져오기
          getStateWithComputed: () => {
            const result = { ...get() };

            Object.keys(computed).forEach((key) => {
              (result as any)[key] = compute(key);
            });

            return result as T & C;
          },
        },

        // 계산된 상태를 포함한 프록시 반환
        getStateWithComputed: () => storeWithComputed,
      };
    };
  };
};
