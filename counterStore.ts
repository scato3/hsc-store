import { createPersistStore, createMiddlewareArray } from "./src";

interface CounterState {
  count: number;
  a: string;
  increase: () => void;
  decrease: () => void;
  setA: (value: string) => void;
}

const middleware = createMiddlewareArray();

// 새로운 createPersistStore 함수 사용 - 인자 순서 변경
export const useCounterStore = createPersistStore<CounterState>(
  (set) => ({
    count: 0,
    a: "",
    increase: () => set((state) => ({ count: state.count + 1 })),
    decrease: () => set((state) => ({ count: state.count - 1 })),
    setA: (value: string) => set({ a: value }),
  }),
  {
    name: "counter-storage",
    version: 1,
  },
  [
    middleware.computed(),
    middleware.timeTravel({
      maxHistory: 50,
    }),
  ]
);

// timeTravel 미들웨어 기능을 위한 헬퍼 함수들
export const getHistory = () => {
  const state = useCounterStore.getState() as any;
  if (state._timeTravel && typeof state._timeTravel.getHistory === "function") {
    return state._timeTravel.getHistory();
  }
  return [];
};

export const getCurrentIndex = () => {
  const state = useCounterStore.getState() as any;
  if (
    state._timeTravel &&
    typeof state._timeTravel.getCurrentIndex === "function"
  ) {
    return state._timeTravel.getCurrentIndex();
  }
  return -1;
};

export const undo = () => {
  const state = useCounterStore.getState() as any;
  if (state._timeTravel && typeof state._timeTravel.goBack === "function") {
    return state._timeTravel.goBack();
  }
  console.warn("goBack 함수를 찾을 수 없습니다.");
  return false;
};

export const redo = () => {
  const state = useCounterStore.getState() as any;
  if (state._timeTravel && typeof state._timeTravel.goForward === "function") {
    return state._timeTravel.goForward();
  }
  console.warn("goForward 함수를 찾을 수 없습니다.");
  return false;
};

export const jumpToState = (index: number) => {
  const state = useCounterStore.getState() as any;
  if (
    state._timeTravel &&
    typeof state._timeTravel.jumpToState === "function"
  ) {
    return state._timeTravel.jumpToState(index);
  }
  console.warn("jumpToState 함수를 찾을 수 없습니다.");
  return false;
};

export const clearHistory = () => {
  const state = useCounterStore.getState() as any;
  if (
    state._timeTravel &&
    typeof state._timeTravel.clearHistory === "function"
  ) {
    return state._timeTravel.clearHistory();
  }
  console.warn("clearHistory 함수를 찾을 수 없습니다.");
  return false;
};
