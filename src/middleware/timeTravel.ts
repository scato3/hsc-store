import { State, Creator, SetState } from "../types";

// 타임트래블 미들웨어 옵션 인터페이스
export interface TimeTravelOptions {
  maxHistory?: number; // 최대 히스토리 수 (기본값: 100)
  enabled?: boolean; // 활성화 여부 (기본값: true)
}

// 타임트래블 미들웨어 구현
export const timeTravelMiddleware = <T extends State>(
  options: TimeTravelOptions = {}
) => {
  return (creator: Creator<T>) => {
    return (set: SetState<T>, get: () => T) => {
      // 옵션 기본값 설정
      const { maxHistory = 100, enabled = true } = options;

      // 히스토리 관리를 위한 변수
      const history: { state: T; timestamp: number }[] = [];
      let currentPointer = -1;
      let isTimeTraveling = false;

      // 기본 상태 생성
      const store = creator((payload) => {
        if (!enabled || isTimeTraveling) {
          set(payload);
          return;
        }

        // 히스토리 추가
        const newState =
          typeof payload === "function"
            ? { ...get(), ...payload(get()) }
            : { ...get(), ...payload };

        // 현재 포인터 이후의 히스토리 제거 (새 분기 생성 시)
        if (currentPointer < history.length - 1) {
          history.splice(currentPointer + 1);
        }

        // 새 상태 추가
        history.push({
          state: newState as T,
          timestamp: Date.now(),
        });

        // 히스토리 최대 개수 유지
        if (history.length > maxHistory) {
          history.shift();
        }

        currentPointer = history.length - 1;
        set(payload);
      }, get);

      return {
        ...store,
        _timeTravel: {
          // 이전 상태로 이동
          goBack: () => {
            if (currentPointer <= 0) return false;

            isTimeTraveling = true;
            currentPointer--;
            set(history[currentPointer].state);
            isTimeTraveling = false;
            return true;
          },

          // 다음 상태로 이동
          goForward: () => {
            if (currentPointer >= history.length - 1) return false;

            isTimeTraveling = true;
            currentPointer++;
            set(history[currentPointer].state);
            isTimeTraveling = false;
            return true;
          },

          // 특정 인덱스로 이동
          jumpToState: (index: number) => {
            if (index < 0 || index >= history.length) return false;

            isTimeTraveling = true;
            currentPointer = index;
            set(history[index].state);
            isTimeTraveling = false;
            return true;
          },

          // 히스토리 가져오기
          getHistory: () =>
            history.map((item, index) => ({
              ...item,
              active: index === currentPointer,
            })),

          // 현재 포인터 위치
          getCurrentIndex: () => currentPointer,

          // 히스토리 길이
          getHistoryLength: () => history.length,

          // 히스토리 초기화
          clearHistory: () => {
            if (history.length === 0) return;

            // 현재 상태만 유지
            const currentState = history[currentPointer].state;
            history.length = 0;
            history.push({
              state: currentState,
              timestamp: Date.now(),
            });
            currentPointer = 0;
          },
        },
      };
    };
  };
};
