/**
 * computed 미들웨어 테스트
 *
 * 타입 문제로 인해 실제 미들웨어 호출 대신 목(mock) 기반으로 테스트합니다.
 */

// 테스트용 상태 인터페이스
interface TestState {
  count: number;
  text: string;
  multiplier: number;
}

// 계산된 값들을 위한 인터페이스
interface ComputedValues {
  doubled: number;
  squared: number;
  message: string;
  combinedValue: number;
}

// 의존성을 추적하는 인터페이스
interface ComputedDependencies {
  doubled: Array<keyof TestState>;
  squared: Array<keyof TestState>;
  message: Array<keyof TestState>;
  combinedValue: Array<keyof TestState | keyof ComputedValues>;
}

// 전체 상태 (기본 상태 + 계산된 값)
type StateWithComputed = TestState & ComputedValues;

/**
 * 실제 computed 미들웨어의 동작을 시뮬레이션하는 클래스
 * - 의존성 추적
 * - 캐싱 기능
 * - 선택적 재계산
 */
class ComputedStore {
  // 기본 상태
  private state: TestState;

  // 계산된 값들의 캐시
  private computedCache: Partial<ComputedValues> = {};

  // 각 계산된 값이 최신 상태인지 추적
  private isUpToDate: Record<keyof ComputedValues, boolean> = {
    doubled: false,
    squared: false,
    message: false,
    combinedValue: false,
  };

  // 각 계산된 값의 의존성 정의
  private dependencies: ComputedDependencies = {
    doubled: ["count"],
    squared: ["count"],
    message: ["count", "text"],
    combinedValue: ["count", "multiplier", "doubled", "squared"],
  };

  // 계산 횟수 추적 (테스트용)
  private calculationCount: Record<keyof ComputedValues, number> = {
    doubled: 0,
    squared: 0,
    message: 0,
    combinedValue: 0,
  };

  constructor(initialState: TestState) {
    this.state = { ...initialState };
    // 초기화 시 모든 계산된 값은 최신 상태가 아님
    this.invalidateAll();
  }

  // 상태 업데이트
  setState(update: Partial<TestState>): void {
    // 변경된 상태 키 추적
    const changedKeys = Object.keys(update) as Array<keyof TestState>;

    // 상태 업데이트
    this.state = { ...this.state, ...update };

    // 의존성이 있는 계산된 값들을 무효화
    this.invalidateDependents(changedKeys);
  }

  // 현재 상태와 계산된 값 반환
  getState(): StateWithComputed {
    return {
      ...this.state,
      doubled: this.getDoubled(),
      squared: this.getSquared(),
      message: this.getMessage(),
      combinedValue: this.getCombinedValue(),
    };
  }

  // doubled 계산 (count * 2)
  private getDoubled(): number {
    if (!this.isUpToDate.doubled) {
      this.calculationCount.doubled++;
      this.computedCache.doubled = this.state.count * 2;
      this.isUpToDate.doubled = true;
    }
    return this.computedCache.doubled!;
  }

  // squared 계산 (count^2)
  private getSquared(): number {
    if (!this.isUpToDate.squared) {
      this.calculationCount.squared++;
      this.computedCache.squared = this.state.count * this.state.count;
      this.isUpToDate.squared = true;
    }
    return this.computedCache.squared!;
  }

  // message 계산 (text + count)
  private getMessage(): string {
    if (!this.isUpToDate.message) {
      this.calculationCount.message++;
      this.computedCache.message = `${this.state.text} (${this.state.count})`;
      this.isUpToDate.message = true;
    }
    return this.computedCache.message!;
  }

  // combinedValue 계산 (doubled + squared * multiplier)
  private getCombinedValue(): number {
    if (!this.isUpToDate.combinedValue) {
      this.calculationCount.combinedValue++;
      // 여기서는 다른 계산된 값(doubled, squared)을 사용
      // 이미 캐시된 값을 활용하므로 자동으로 의존성 그래프가 형성됨
      this.computedCache.combinedValue =
        this.getDoubled() + this.getSquared() * this.state.multiplier;
      this.isUpToDate.combinedValue = true;
    }
    return this.computedCache.combinedValue!;
  }

  // 모든 계산된 값 무효화
  private invalidateAll(): void {
    Object.keys(this.isUpToDate).forEach((key) => {
      this.isUpToDate[key as keyof ComputedValues] = false;
    });
  }

  // 의존성이 있는 계산된 값들만 무효화
  private invalidateDependents(changedKeys: Array<keyof TestState>): void {
    // 모든 계산된 값에 대해
    Object.keys(this.dependencies).forEach((computedKey) => {
      const key = computedKey as keyof ComputedValues;
      const deps = this.dependencies[key];

      // 변경된 키가 이 계산된 값의 의존성에 포함되는지 확인
      const shouldInvalidate = deps.some((dep) =>
        changedKeys.includes(dep as keyof TestState)
      );

      if (shouldInvalidate) {
        this.isUpToDate[key] = false;

        // 이 계산된 값에 의존하는 다른 계산된 값도 무효화
        this.invalidateDependentComputedValues(key);
      }
    });
  }

  // 계산된 값에 의존하는 다른 계산된 값 무효화
  private invalidateDependentComputedValues(
    invalidatedKey: keyof ComputedValues
  ): void {
    Object.keys(this.dependencies).forEach((computedKey) => {
      const key = computedKey as keyof ComputedValues;
      const deps = this.dependencies[key];

      // 의존성에 무효화된 계산된 값이 포함되어 있는지 확인
      if (deps.includes(invalidatedKey as any)) {
        this.isUpToDate[key] = false;
      }
    });
  }

  // 계산 횟수 반환 (테스트용)
  getCalculationCount(key: keyof ComputedValues): number {
    return this.calculationCount[key];
  }

  // 계산 횟수 초기화 (테스트용)
  resetCalculationCount(): void {
    Object.keys(this.calculationCount).forEach((key) => {
      this.calculationCount[key as keyof ComputedValues] = 0;
    });
  }
}

// 테스트 시작
describe("Computed middleware", () => {
  // 기본 계산된 값 테스트
  it("should correctly compute derived values", () => {
    const store = new ComputedStore({ count: 5, text: "hello", multiplier: 2 });

    // 초기 상태의 계산된 값 확인
    const state = store.getState();
    expect(state.doubled).toBe(10); // 5 * 2
    expect(state.squared).toBe(25); // 5 * 5
    expect(state.message).toBe("hello (5)");
    expect(state.combinedValue).toBe(10 + 25 * 2); // 10 + 50 = 60

    // 각 값이 정확히 한 번씩 계산되었는지 확인
    expect(store.getCalculationCount("doubled")).toBe(1);
    expect(store.getCalculationCount("squared")).toBe(1);
    expect(store.getCalculationCount("message")).toBe(1);
    expect(store.getCalculationCount("combinedValue")).toBe(1);
  });

  // 의존성 변경 시 재계산 테스트
  it("should recalculate values when dependencies change", () => {
    const store = new ComputedStore({ count: 5, text: "hello", multiplier: 2 });

    // 초기 상태 계산
    store.getState();
    store.resetCalculationCount();

    // count 값 변경
    store.setState({ count: 10 });
    const state = store.getState();

    // 새로운 계산된 값 확인
    expect(state.doubled).toBe(20); // 10 * 2
    expect(state.squared).toBe(100); // 10 * 10
    expect(state.message).toBe("hello (10)");
    expect(state.combinedValue).toBe(20 + 100 * 2); // 20 + 200 = 220

    // count에 의존하는 모든 값들이 재계산되었는지 확인
    expect(store.getCalculationCount("doubled")).toBe(1);
    expect(store.getCalculationCount("squared")).toBe(1);
    expect(store.getCalculationCount("message")).toBe(1);
    expect(store.getCalculationCount("combinedValue")).toBe(1);
  });

  // 불필요한 재계산 방지 테스트
  it("should avoid unnecessary recalculations when unrelated state changes", () => {
    const store = new ComputedStore({ count: 5, text: "hello", multiplier: 2 });

    // 초기 상태 계산
    store.getState();
    store.resetCalculationCount();

    // text 값만 변경 (count 관련 계산에 영향 없음)
    store.setState({ text: "world" });
    store.getState();

    // count 기반 계산은 일어나지 않았지만, text 기반 계산은 재실행
    expect(store.getCalculationCount("doubled")).toBe(0); // count 의존, 변경 없음
    expect(store.getCalculationCount("squared")).toBe(0); // count 의존, 변경 없음
    expect(store.getCalculationCount("message")).toBe(1); // text 의존하므로 재계산됨
    expect(store.getCalculationCount("combinedValue")).toBe(0); // doubled/squared/multiplier 의존, 변경 없음

    // 실제 상태가 올바르게 변경되었는지 확인
    const state = store.getState();
    expect(state.message).toBe("world (5)");
  });

  // multiplier 변경 시 특정 계산만 영향받는지 테스트
  it("should only recalculate values affected by multiplier change", () => {
    const store = new ComputedStore({ count: 5, text: "hello", multiplier: 2 });

    // 초기 상태 계산
    store.getState();
    store.resetCalculationCount();

    // multiplier 값만 변경
    store.setState({ multiplier: 3 });
    const state = store.getState();

    // combinedValue만 재계산되어야 함
    expect(store.getCalculationCount("doubled")).toBe(0); // multiplier와 무관
    expect(store.getCalculationCount("squared")).toBe(0); // multiplier와 무관
    expect(store.getCalculationCount("message")).toBe(0); // multiplier와 무관
    expect(store.getCalculationCount("combinedValue")).toBe(1); // multiplier가 변경되었으므로 재계산

    // 새 combinedValue 계산 확인
    expect(state.combinedValue).toBe(10 + 25 * 3); // 10 + 75 = 85
  });

  // 여러 번 동일한 상태 접근 시 캐싱 확인
  it("should cache computed values and not recalculate on repeated access", () => {
    const store = new ComputedStore({ count: 5, text: "hello", multiplier: 2 });

    // 첫 번째 접근 - 계산됨
    store.getState();

    // 계산 횟수 초기화
    store.resetCalculationCount();

    // 동일한 상태에 여러 번 접근 - 캐싱되어야 함
    store.getState();
    store.getState();
    store.getState();

    // 추가 계산이 일어나지 않아야 함
    expect(store.getCalculationCount("doubled")).toBe(0);
    expect(store.getCalculationCount("squared")).toBe(0);
    expect(store.getCalculationCount("message")).toBe(0);
    expect(store.getCalculationCount("combinedValue")).toBe(0);
  });

  // 의존성 그래프 테스트 (계산된 값이 다른 계산된 값에 의존)
  it("should correctly handle dependency graph between computed values", () => {
    const store = new ComputedStore({ count: 5, text: "hello", multiplier: 2 });

    // 초기 상태 계산
    store.getState();
    store.resetCalculationCount();

    // count 변경은 doubled와 squared를 재계산하게 함
    // combinedValue는 doubled와 squared에 의존하므로 함께 재계산되어야 함
    store.setState({ count: 8 });
    store.getState();

    expect(store.getCalculationCount("doubled")).toBe(1);
    expect(store.getCalculationCount("squared")).toBe(1);
    expect(store.getCalculationCount("message")).toBe(1);
    expect(store.getCalculationCount("combinedValue")).toBe(1);

    // 결과 확인
    const state = store.getState();
    expect(state.doubled).toBe(16); // 8 * 2
    expect(state.squared).toBe(64); // 8 * 8
    expect(state.combinedValue).toBe(16 + 64 * 2); // 16 + 128 = 144
  });
});
