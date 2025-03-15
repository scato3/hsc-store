import { createStore } from "../src/core/createStore";

interface TestState {
  count: number;
  text: string;
}

describe("createStore", () => {
  // 기본 스토어 생성 테스트
  it("should create a store with initial state", () => {
    const initialState = { count: 0, text: "hello" };
    const useStore = createStore<TestState>(() => initialState);

    expect(useStore.getState()).toEqual(initialState);
  });

  // 상태 업데이트 테스트
  it("should update state", () => {
    const initialState = { count: 0, text: "hello" };
    const useStore = createStore<TestState>(() => initialState);

    useStore.setState({ count: 5 });
    expect(useStore.getState()).toEqual({ count: 5, text: "hello" });

    useStore.setState({ text: "world" });
    expect(useStore.getState()).toEqual({ count: 5, text: "world" });
  });

  // 상태 업데이트 함수 테스트
  it("should update state with function", () => {
    const initialState = { count: 0, text: "hello" };
    const useStore = createStore<TestState>(() => initialState);

    useStore.setState((state) => ({ count: state.count + 1 }));
    expect(useStore.getState()).toEqual({ count: 1, text: "hello" });

    useStore.setState((state) => ({
      count: state.count + 1,
      text: `${state.text} world`,
    }));
    expect(useStore.getState()).toEqual({ count: 2, text: "hello world" });
  });

  // 구독 기능 테스트
  it("should notify subscribers when state changes", () => {
    const initialState = { count: 0, text: "hello" };
    const useStore = createStore<TestState>(() => initialState);

    const listener = jest.fn();
    const unsubscribe = useStore.subscribe(listener);

    useStore.setState({ count: 5 });
    expect(listener).toHaveBeenCalledWith({ count: 5, text: "hello" });

    useStore.setState({ text: "world" });
    expect(listener).toHaveBeenCalledWith({ count: 5, text: "world" });

    // 구독 취소 테스트
    unsubscribe();
    useStore.setState({ count: 10 });
    expect(listener).toHaveBeenCalledTimes(2); // 이전 2번만 호출되었어야 함
  });

  // 동일한 값으로 업데이트할 때 리스너가 호출되지 않는지 테스트
  it("should not notify subscribers when state does not change", () => {
    const initialState = { count: 0, text: "hello" };
    const useStore = createStore<TestState>(() => initialState);

    const listener = jest.fn();
    useStore.subscribe(listener);

    useStore.setState({ count: 0 }); // 이미 0이므로 변경 없음
    expect(listener).not.toHaveBeenCalled();

    useStore.setState((state) => ({ count: state.count })); // 동일 값 반환
    expect(listener).not.toHaveBeenCalled();
  });

  // hydrate 기능 테스트
  it("should hydrate state", () => {
    const initialState = { count: 0, text: "hello" };
    const useStore = createStore<TestState>(() => initialState);

    useStore.hydrate({ count: 10, text: "hydrated" });
    expect(useStore.getState()).toEqual({ count: 10, text: "hydrated" });

    // 부분 상태로 hydrate
    const storeWithPartial = createStore<TestState>(() => initialState);
    storeWithPartial.hydrate({ count: 20 });
    expect(storeWithPartial.getState()).toEqual({ count: 20, text: "hello" });
  });
});
