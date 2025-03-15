# HSC-Store

전역 상태 관리 라이브러리입니다. 직관적인 API를 제공합니다.

## ✨ 주요 특징

- **TypeScript 지원**: 타입 안전성 제공
- **React 통합**: React 컴포넌트에서 쉽게 사용 가능
- **선택적 구독**: 필요한 부분만 선택하여 구독 가능
- **영구 저장**: localStorage/sessionStorage를 통한 상태 유지 기능
- **타임트래블 디버깅**: 상태 변화 이력을 추적하고 이전/이후 상태로 이동 가능
- **파생 상태**: 기존 상태에서 자동으로 계산되는 상태 관리

## 📦 설치

```bash
npm install hsc-store
# 또는
yarn add hsc-store
# 또는
pnpm add hsc-store
```

## 🚀 기본 사용법

### 스토어 생성하기

```typescript
import { createStore } from "hsc-store";

// 카운터 스토어 생성
const useCounterStore = createStore((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
  decrement: () => set((state) => ({ count: state.count - 1 })),
  reset: () => set({ count: 0 }),
}));
```

### React 컴포넌트에서 사용하기

```tsx
import React from "react";
import { useCounterStore } from "./stores/counter";

function Counter() {
  // 훅으로 사용 - 자동으로 리렌더링됨
  const { count, increment, decrement, reset } = useCounterStore();

  return (
    <div>
      <h1>카운터: {count}</h1>
      <button onClick={increment}>증가</button>
      <button onClick={decrement}>감소</button>
      <button onClick={reset}>초기화</button>
    </div>
  );
}
```

### 컴포넌트 외부에서 사용하기

```typescript
// 상태 직접 접근
const count = useCounterStore.getState().count;
console.log("현재 카운트:", count);

// 상태 변경하기
useCounterStore.getState().increment();
// 또는
useCounterStore.setState({ count: 10 });

// 변경 구독하기
const unsubscribe = useCounterStore.subscribe((state) =>
  console.log("상태가 변경되었습니다:", state.count)
);

// 구독 해지하기
unsubscribe();
```

## 🔄 비동기 액션 처리

```typescript
const useUserStore = createStore((set) => ({
  user: null,
  loading: false,
  error: null,

  // 비동기 액션
  fetchUser: async (id) => {
    set({ loading: true, error: null });

    try {
      const response = await fetch(`/api/users/${id}`);
      const userData = await response.json();
      set({ user: userData, loading: false });
    } catch (err) {
      set({ error: err.message, loading: false });
    }
  },

  logout: () => set({ user: null }),
}));
```

## 💾 영구 저장 (Persistence)

새로고침 후에도 상태를 유지하기 위해 `persist` 기능을 사용할 수 있습니다:

```typescript
import { createStore, persist } from "hsc-store";

// 기본 스토어 생성
const useSettingsStore = createStore((set) => ({
  theme: "light",
  fontSize: 16,
  setTheme: (theme) => set({ theme }),
  setFontSize: (fontSize) => set({ fontSize }),
}));

// 영구 저장 추가
const usePersistedSettingsStore = persist(useSettingsStore, {
  name: "settings-storage", // 로컬 스토리지 키 이름
  // 선택적 옵션
  storage: localStorage, // 기본값: localStorage
  partialize: (state) => ({ theme: state.theme }), // 일부 필드만 저장
  version: 1, // 버전 관리
  migrate: (persistedState, version) => {
    // 이전 버전 데이터 마이그레이션
    if (version === 0) {
      return { ...persistedState, fontSize: 16 };
    }
    return persistedState;
  },
  onRehydrateStorage: (state) => {
    console.log("상태가 복원되었습니다:", state);
  },
  skipHydration: true, // 하이드레이션 문제 방지
});
```

### Zustand 스타일 (한번에 생성)

```typescript
import { createPersistStore } from "hsc-store";

// 한번에 스토어 생성 및 영구 저장 설정
const useSettingsStore = createPersistStore(
  (set) => ({
    theme: "light",
    fontSize: 16,
    setTheme: (theme) => set({ theme }),
    setFontSize: (fontSize) => set({ fontSize }),
  }),
  {
    name: "settings-storage",
    // 다른 선택적 옵션들...
  }
);

// 사용법은 동일
function ThemeSwitcher() {
  const { theme, setTheme } = useSettingsStore();

  return (
    <button onClick={() => setTheme(theme === "light" ? "dark" : "light")}>
      테마 변경 (현재: {theme})
    </button>
  );
}
```

### 미들웨어 패턴 (Zustand 호환)

```typescript
import { createStore, persistMiddleware } from "hsc-store";

// 미들웨어 패턴 사용
const useSettingsStore = createStore(
  persistMiddleware({
    name: "settings-storage",
    // 다른 옵션들...
  })((set) => ({
    theme: "light",
    fontSize: 16,
    setTheme: (theme) => set({ theme }),
    setFontSize: (fontSize) => set({ fontSize }),
  }))
);
```

## 📝 API 문서

### `createStore(creator)`

스토어를 생성합니다. `creator` 함수는 `set` 함수를 파라미터로 받아 초기 상태와 액션을 반환합니다.

### `persist(store, options)`

스토어에 영구 저장 기능을 추가합니다. 새로고침 후에도 상태를 유지합니다.

### `createPersistStore(creator, options)`

스토어 생성과 영구 저장 기능을 한번에 적용합니다. Zustand 스타일 API.

### `persistMiddleware(options)`

미들웨어 패턴으로 사용할 수 있는 persist 함수입니다. Zustand와 완전 호환.

### `timeTravelMiddleware(options)`

상태 변화 이력을 추적하고 이전/이후 상태로 이동할 수 있는, 타임트래블 디버깅 기능을 추가합니다.

- `maxHistory`: 최대 히스토리 저장 개수 (기본값: 100)
- `enabled`: 타임트래블 활성화 여부 (기본값: true)

API:

- `_timeTravel.goBack()`: 이전 상태로 이동
- `_timeTravel.goForward()`: 다음 상태로 이동
- `_timeTravel.jumpToState(index)`: 특정 인덱스의 상태로 이동
- `_timeTravel.getHistory()`: 전체 히스토리 데이터 가져오기
- `_timeTravel.getCurrentIndex()`: 현재 상태 인덱스 가져오기
- `_timeTravel.clearHistory()`: 히스토리 초기화

### `computedMiddleware(options)`

다른 상태에서 자동으로 계산되는 파생 상태 기능을 추가합니다.

- `computed`: 계산된 속성 정의
- `dependsOn`: 각 계산 속성이 의존하는 기본 상태 필드 정의

API:

- `_computed.recompute(key)`: 특정 계산 속성 재계산
- `_computed.recomputeAll()`: 모든 계산 속성 재계산
- `_computed.getStateWithComputed()`: 기본 상태와 계산된 상태를 모두 포함한 결과 가져오기
- `getStateWithComputed()`: 기본 및 계산된 상태에 접근 가능한 프록시 반환

### 스토어 API

- `useStore()`: React 훅으로 전체 상태를 반환
- `useStore(selector)`: 특정 부분만 선택하여 반환
- `getState()`: 현재 상태 가져오기
- `setState(partial)`: 상태 업데이트
- `subscribe(listener)`: 변경 구독 (구독 해지 함수 반환)

### 영구 저장 API

- `persist.getOptions()`: 현재 persist 옵션 가져오기
- `persist.rehydrate()`: 수동으로 상태 복원 실행
- `persist.hasHydrated()`: 하이드레이션 완료 여부 확인
- `persist.onHydrate`: 하이드레이션 완료 콜백
- `persist.clearStorage()`: 저장된 상태 제거

## 📄 라이선스

MIT ©

## ✅ 추가 기능들

### 1. 타임트래블 디버깅 (Time Travel)

상태 변화 기록을 추적하고 이전/이후 상태로 자유롭게 이동할 수 있는 기능을 제공합니다.

```typescript
import { createStore, timeTravelMiddleware } from "hsc-store";

// 타임트래블 미들웨어 적용
const useCounterStore = createStore(
  timeTravelMiddleware({
    maxHistory: 50, // 최대 히스토리 수 (기본값: 100)
    enabled: true, // 활성화 여부 (기본값: true)
  })((set, get) => ({
    count: 0,
    increment: () => set((state) => ({ count: state.count + 1 })),
    decrement: () => set((state) => ({ count: state.count - 1 })),
  }))
);

// 디버깅 패널에서 사용하기
function DebugPanel() {
  const timeTravel = useCounterStore.getState()._timeTravel;
  const history = timeTravel.getHistory();
  const currentIndex = timeTravel.getCurrentIndex();

  return (
    <div className="debug-panel">
      <h3>상태 히스토리 ({history.length}개)</h3>

      <div className="controls">
        <button
          onClick={() => timeTravel.goBack()}
          disabled={currentIndex <= 0}
        >
          이전 상태
        </button>

        <button
          onClick={() => timeTravel.goForward()}
          disabled={currentIndex >= history.length - 1}
        >
          다음 상태
        </button>

        <button onClick={() => timeTravel.clearHistory()}>
          히스토리 초기화
        </button>
      </div>

      <div className="history-list">
        {history.map((item, index) => (
          <div
            key={index}
            className={`history-item ${index === currentIndex ? "active" : ""}`}
            onClick={() => timeTravel.jumpToState(index)}
          >
            {new Date(item.timestamp).toLocaleTimeString()}:
            {JSON.stringify(item.state)}
          </div>
        ))}
      </div>
    </div>
  );
}
```

### 2. 파생 상태 (Computed State)

다른 상태 값에서 자동으로 계산되는 파생 상태를 정의할 수 있습니다. 의존하는 기본 상태가 변경될 때마다 자동으로 재계산됩니다.

```typescript
import { createStore, computedMiddleware } from "hsc-store";

// 파생 상태 미들웨어 적용
const useCartStore = createStore(
  computedMiddleware<CartState, ComputedCartState>({
    computed: {
      // 총 금액 계산
      totalPrice: (state) =>
        state.items.reduce((sum, item) => sum + item.price * item.quantity, 0),

      // 총 아이템 개수
      totalItems: (state) =>
        state.items.reduce((sum, item) => sum + item.quantity, 0),

      // 10% 할인된 금액
      discountedPrice: (state) =>
        state.items.reduce((sum, item) => sum + item.price * item.quantity, 0) *
        0.9,
    },
    // 성능 최적화를 위한 의존성 명시 (선택 사항)
    dependsOn: {
      totalPrice: ["items"],
      totalItems: ["items"],
      discountedPrice: ["items"],
    },
  })((set) => ({
    items: [],
    addItem: (item) =>
      set((state) => ({
        items: [...state.items, item],
      })),
    updateQuantity: (id, quantity) =>
      set((state) => ({
        items: state.items.map((item) =>
          item.id === id ? { ...item, quantity } : item
        ),
      })),
    removeItem: (id) =>
      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
      })),
  }))
);

// 컴포넌트에서 사용하기
function Cart() {
  // 기본 상태와 계산된 상태 모두 접근 가능
  const {
    items,
    addItem,
    updateQuantity,
    removeItem,
    // 자동으로 계산되는 파생 상태
    totalPrice,
    discountedPrice,
    totalItems,
  } = useCartStore();

  return (
    <div className="cart">
      <h2>장바구니 ({totalItems}개 상품)</h2>

      {items.map((item) => (
        <div key={item.id} className="cart-item">
          {/* 아이템 렌더링 */}
        </div>
      ))}

      <div className="cart-summary">
        <p>총 금액: {totalPrice.toLocaleString()}원</p>
        <p>할인 금액: {(totalPrice - discountedPrice).toLocaleString()}원</p>
        <p>최종 금액: {discountedPrice.toLocaleString()}원</p>
      </div>
    </div>
  );
}

// 특정 계산값만 강제로 재계산하기 (필요한 경우)
useCartStore.getState()._computed.recompute("totalPrice");

// 모든 계산값 재계산하기
useCartStore.getState()._computed.recomputeAll();

// 계산된 상태를 포함한 전체 상태 가져오기
const stateWithComputed = useCartStore
  .getState()
  ._computed.getStateWithComputed();

// 혹은 프록시를 통해 계산된 상태에 직접 접근하기
const stateProxy = useCartStore.getStateWithComputed();
console.log(stateProxy.totalPrice); // 계산된 값을 반환합니다
```
