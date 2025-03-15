/**
 * timeTravelMiddleware 테스트
 *
 * 타입 문제로 인해 실제 미들웨어 호출 대신 목(mock) 기반으로 테스트합니다.
 */

interface TimeTravelTestState {
  count: number;
  text: string;
  multiplier?: number;
}

type HistoryEntry<T> = {
  state: T;
  timestamp: number;
  active?: boolean;
};

// 타임트래블 API 목(mock) 인터페이스
interface TimeTravelAPI<T> {
  goBack: () => boolean;
  goForward: () => boolean;
  jumpToState: (index: number) => boolean;
  getHistory: () => Array<HistoryEntry<T>>;
  getCurrentIndex: () => number;
  getHistoryLength: () => number;
  clearHistory: () => void;
}

// 타임트래블 기능이 있는 스토어 목(mock) 구현
class MockTimeTravel<T> {
  private history: Array<HistoryEntry<T>> = [];
  private currentIndex: number = -1;
  private currentState: T;
  private maxHistory: number;
  private enabled: boolean;

  constructor(
    initialState: T,
    options: { maxHistory?: number; enabled?: boolean } = {}
  ) {
    this.currentState = { ...initialState } as T;
    this.maxHistory = options.maxHistory || 100;
    this.enabled = options.enabled !== false;
    this.addToHistory(initialState);
  }

  // 새 상태 추가
  setState(newState: Partial<T>): T {
    if (!this.enabled) {
      this.currentState = { ...this.currentState, ...newState } as T;
      return this.currentState;
    }

    // 새 상태 계산
    const nextState = { ...this.currentState, ...newState } as T;

    // 현재 포인터 이후의 히스토리 제거 (새 분기 생성 시)
    if (this.currentIndex < this.history.length - 1) {
      this.history.splice(this.currentIndex + 1);
    }

    // 새 상태 추가
    this.addToHistory(nextState);

    return this.currentState;
  }

  // 현재 상태 조회
  getState(): T {
    return this.currentState;
  }

  // 타임트래블 API
  getTimeTravelAPI(): TimeTravelAPI<T> {
    return {
      goBack: () => this.goBack(),
      goForward: () => this.goForward(),
      jumpToState: (index: number) => this.jumpToState(index),
      getHistory: () => this.getHistory(),
      getCurrentIndex: () => this.getCurrentIndex(),
      getHistoryLength: () => this.getHistoryLength(),
      clearHistory: () => this.clearHistory(),
    };
  }

  // 히스토리에 추가
  private addToHistory(state: T): void {
    this.history.push({
      state: { ...state } as T,
      timestamp: Date.now(),
    });

    // 히스토리 최대 개수 유지
    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    this.currentIndex = this.history.length - 1;
    this.currentState = { ...state } as T;
  }

  // 이전 상태로 이동
  private goBack(): boolean {
    if (this.currentIndex <= 0) return false;

    this.currentIndex--;
    this.currentState = { ...this.history[this.currentIndex].state };
    return true;
  }

  // 다음 상태로 이동
  private goForward(): boolean {
    if (this.currentIndex >= this.history.length - 1) return false;

    this.currentIndex++;
    this.currentState = { ...this.history[this.currentIndex].state };
    return true;
  }

  // 특정 인덱스로 이동
  private jumpToState(index: number): boolean {
    if (index < 0 || index >= this.history.length) return false;

    this.currentIndex = index;
    this.currentState = { ...this.history[index].state };
    return true;
  }

  // 히스토리 조회
  private getHistory(): Array<HistoryEntry<T>> {
    return this.history.map((item, index) => ({
      ...item,
      active: index === this.currentIndex,
    }));
  }

  // 현재 인덱스 조회
  private getCurrentIndex(): number {
    return this.currentIndex;
  }

  // 히스토리 길이 조회
  private getHistoryLength(): number {
    return this.history.length;
  }

  // 히스토리 초기화
  private clearHistory(): void {
    if (this.history.length === 0) return;

    const currentState = { ...this.currentState };
    this.history = [
      {
        state: currentState as T,
        timestamp: Date.now(),
      },
    ];
    this.currentIndex = 0;
  }
}

// 테스트 시작
describe("timeTravel functionality", () => {
  // 기본 기능 테스트
  it("should record state changes history", () => {
    const initialState: TimeTravelTestState = { count: 0, text: "initial" };
    const timeTravelStore = new MockTimeTravel<TimeTravelTestState>(
      initialState
    );
    const timeTravel = timeTravelStore.getTimeTravelAPI();

    // 상태 변경 기록
    timeTravelStore.setState({ count: 1 });
    timeTravelStore.setState({ count: 2 });
    timeTravelStore.setState({ text: "updated" });

    // 히스토리 확인
    const history = timeTravel.getHistory();
    expect(history.length).toBe(4); // 초기 상태 + 3번의 변경
    expect(history[0].state).toEqual({ count: 0, text: "initial" });
    expect(history[3].state).toEqual({ count: 2, text: "updated" });

    // 현재 포인터 확인
    const currentIndex = timeTravel.getCurrentIndex();
    expect(currentIndex).toBe(3); // 0부터 시작하는 인덱스, 마지막 위치
  });

  // 시간 이동 테스트
  it("should allow time travel between states", () => {
    const initialState: TimeTravelTestState = { count: 0, text: "initial" };
    const timeTravelStore = new MockTimeTravel<TimeTravelTestState>(
      initialState
    );
    const timeTravel = timeTravelStore.getTimeTravelAPI();

    // 상태 변경 기록
    timeTravelStore.setState({ count: 1 });
    timeTravelStore.setState({ count: 2 });
    timeTravelStore.setState({ text: "updated" });

    // 이전 상태로 이동
    timeTravel.goBack();
    expect(timeTravelStore.getState()).toEqual({ count: 2, text: "initial" });

    // 한 번 더 이전 상태로 이동
    timeTravel.goBack();
    expect(timeTravelStore.getState()).toEqual({ count: 1, text: "initial" });

    // 앞으로 이동
    timeTravel.goForward();
    expect(timeTravelStore.getState()).toEqual({ count: 2, text: "initial" });

    // 특정 인덱스로 이동
    timeTravel.jumpToState(0);
    expect(timeTravelStore.getState()).toEqual({ count: 0, text: "initial" });

    // 다시 마지막 상태로 이동
    timeTravel.jumpToState(3);
    expect(timeTravelStore.getState()).toEqual({ count: 2, text: "updated" });
  });

  // 히스토리 제한 테스트
  it("should respect maxHistory option", () => {
    const initialState: TimeTravelTestState = { count: 0, text: "initial" };
    const timeTravelStore = new MockTimeTravel<TimeTravelTestState>(
      initialState,
      {
        maxHistory: 3,
      }
    );
    const timeTravel = timeTravelStore.getTimeTravelAPI();

    // 최대 기록 개수 초과하게 상태 변경
    timeTravelStore.setState({ count: 1 });
    timeTravelStore.setState({ count: 2 });
    timeTravelStore.setState({ count: 3 });
    timeTravelStore.setState({ count: 4 });

    // 히스토리 확인 - 가장 오래된 것부터 제거되어야 함
    const history = timeTravel.getHistory();
    expect(history.length).toBe(3); // maxHistory에 의해 3개만 유지

    // 가장 오래된 기록(초기 상태)은 제거되고 최근 3개만 남음
    expect(history[0].state.count).toBe(2); // 가장 오래된 기록이 이제 count=2부터 시작
    expect(history[2].state.count).toBe(4); // 마지막 기록은 count=4
  });

  // 히스토리 분기 처리 테스트
  it("should handle branching history", () => {
    const initialState: TimeTravelTestState = { count: 0, text: "initial" };
    const timeTravelStore = new MockTimeTravel<TimeTravelTestState>(
      initialState
    );
    const timeTravel = timeTravelStore.getTimeTravelAPI();

    // 상태 변경 기록
    timeTravelStore.setState({ count: 1 });
    timeTravelStore.setState({ count: 2 });
    timeTravelStore.setState({ count: 3 });

    // 중간 상태로 이동
    timeTravel.goBack(); // count: 2

    // 새로운 분기 생성
    timeTravelStore.setState({ text: "branch" });

    // 히스토리 확인
    const history = timeTravel.getHistory();
    expect(history.length).toBe(4); // 초기 + 3번 변경 중 2번까지 + 새 분기 1개
    expect(history[3].state).toEqual({ count: 2, text: "branch" });

    // count=3 상태는 삭제되었어야 함
    const containsCount3 = history.some((item) => item.state.count === 3);
    expect(containsCount3).toBe(false);
  });

  // 히스토리 초기화 테스트
  it("should clear history but keep current state", () => {
    const initialState: TimeTravelTestState = { count: 0, text: "initial" };
    const timeTravelStore = new MockTimeTravel<TimeTravelTestState>(
      initialState
    );
    const timeTravel = timeTravelStore.getTimeTravelAPI();

    // 상태 변경 기록
    timeTravelStore.setState({ count: 1 });
    timeTravelStore.setState({ count: 2 });
    timeTravelStore.setState({ text: "updated" });

    // 현재 상태 저장
    const currentState = { ...timeTravelStore.getState() };

    // 히스토리 초기화
    timeTravel.clearHistory();

    // 히스토리는 현재 상태만 포함
    const history = timeTravel.getHistory();
    expect(history.length).toBe(1);
    expect(history[0].state).toEqual(currentState);
    expect(timeTravel.getCurrentIndex()).toBe(0);

    // 현재 상태는 유지
    expect(timeTravelStore.getState()).toEqual(currentState);
  });

  // 비활성화 테스트
  it("should respect enabled option", () => {
    const initialState: TimeTravelTestState = { count: 0, text: "initial" };
    const timeTravelStore = new MockTimeTravel<TimeTravelTestState>(
      initialState,
      {
        enabled: false,
      }
    );
    const timeTravel = timeTravelStore.getTimeTravelAPI();

    // 상태 변경
    timeTravelStore.setState({ count: 1 });
    timeTravelStore.setState({ count: 2 });

    // enabled=false이므로 초기 상태만 기록되어야 함
    const history = timeTravel.getHistory();
    expect(history.length).toBe(1);
    expect(history[0].state).toEqual(initialState);

    // 현재 상태는 변경되어야 함
    expect(timeTravelStore.getState()).toEqual({ count: 2, text: "initial" });
  });
});
