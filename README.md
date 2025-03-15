# HSC-Store

전역 상태 관리 라이브러리입니다. 불필요한 기능 없이 필수적인 것만 담아 가볍고 직관적인 API를 제공합니다.

## ✨ 주요 특징

- **가벼움**: 최소한의 코드로 구현된 경량 라이브러리
- **TypeScript 지원**: 완벽한 타입 안전성
- **React 통합**: React 컴포넌트에서 쉽게 사용 가능
- **선택적 구독**: 필요한 부분만 선택하여 구독 가능
- **영구 저장**: localStorage/sessionStorage를 통한 상태 유지 기능
- **타임트래블 디버깅**: 상태 변화 이력을 추적하고 이전/이후 상태로 이동 가능
- **스키마 검증**: 스키마 기반 상태 유효성 검사 시스템
- **파생 상태**: 기존 상태에서 자동으로 계산되는 상태 관리
- **SSR 최적화**: Next.js와 같은 SSR 환경에서 하이드레이션 미스매치 자동 방지

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
  // SSR 환경에서는 자동으로 true로 설정됩니다
  // skipHydration: true
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

### 하이드레이션 미스매치 방지 (Next.js에서 중요)

Next.js와 같은 SSR 환경에서 localStorage에 저장된 상태와 서버 렌더링된 상태 간의 불일치는 하이드레이션 오류를 발생시킬 수 있습니다. HSC-Store는 이 문제를 자동으로 처리합니다:

```typescript
// store/counterStore.ts
"use client";

import { createPersistStore } from "hsc-store";

// 스토어 생성
export const useCounterStore = createPersistStore(
  (set) => ({
    count: 0, // 초기 상태는 항상 서버와 클라이언트 간에 일관성 있어야 함
    increment: () => set((state) => ({ count: state.count + 1 })),
    decrement: () => set((state) => ({ count: state.count - 1 })),
    reset: () => set({ count: 0 }),
  }),
  {
    name: "counter-storage",
    // 추가 설정 필요없음 - 서버 환경에서 자동으로 처리됨
  }
);

// 하이드레이션 상태 확인 유틸리티
export const hasHydrated = () => useCounterStore.persist?.hasHydrated();
```

#### 클라이언트 컴포넌트 패턴 (하이드레이션 미스매치 방지)

Next.js 클라이언트 컴포넌트에서 사용할 때는 다음 패턴을 따르세요:

```tsx
// components/Counter.tsx
"use client";

import { useCounterStore } from "@/store/counterStore";
import { useState, useEffect } from "react";

export default function Counter() {
  // 클라이언트 마운트 상태 추적
  const [isMounted, setIsMounted] = useState(false);

  // 스토어에서 상태와 액션 가져오기
  const { count, increment, decrement, reset } = useCounterStore();

  // 클라이언트에서만 실행되는 효과
  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <div className="counter">
      {/* 항상 표시되는 정적 콘텐츠 - 서버와 클라이언트 모두에서 렌더링됨 */}
      <h2>카운터: {count}</h2>

      {/* 이 부분은 클라이언트 마운트 후에만 표시됨 */}
      {isMounted && (
        <div className="controls">
          <button onClick={increment}>증가</button>
          <button onClick={decrement}>감소</button>
          <button onClick={reset}>초기화</button>

          {/* 하이드레이션 상태 표시 (옵션) */}
          <div className="status">
            {useCounterStore.persist?.hasHydrated()
              ? "로컬스토리지에서 상태 로드됨"
              : "초기 상태"}
          </div>
        </div>
      )}
    </div>
  );
}
```

#### 더 안전한 대안: 컨테이너 컴포넌트 패턴

하이드레이션 미스매치를 완전히 방지하기 위한 더 엄격한 패턴도 있습니다:

```tsx
// components/CounterContainer.tsx (클라이언트 컴포넌트)
"use client";

import { useCounterStore } from "@/store/counterStore";
import { useState, useEffect } from "react";
import CounterUI from "./CounterUI"; // 순수 UI 컴포넌트

export default function CounterContainer() {
  // 클라이언트 마운트 상태 추적
  const [isMounted, setIsMounted] = useState(false);

  // 하이드레이션 이후에만 렌더링
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // 서버 렌더링 시 또는 마운트 전에는 최소한의 HTML만 반환
  if (!isMounted) {
    return <div className="counter-placeholder">카운터 로딩 중...</div>;
  }

  // 마운트 후에만 스토어 데이터 접근 및 상호작용 컴포넌트 렌더링
  const { count, increment, decrement, reset } = useCounterStore();

  return (
    <CounterUI
      count={count}
      onIncrement={increment}
      onDecrement={decrement}
      onReset={reset}
    />
  );
}

// components/CounterUI.tsx (서버/클라이언트 모두에서 사용 가능)
export default function CounterUI({
  count,
  onIncrement,
  onDecrement,
  onReset,
}) {
  return (
    <div className="counter">
      <h2>카운터: {count}</h2>
      <div className="controls">
        <button onClick={onIncrement}>증가</button>
        <button onClick={onDecrement}>감소</button>
        <button onClick={onReset}>초기화</button>
      </div>
    </div>
  );
}
```

#### 문제가 계속되는 경우의 대응 방법

하이드레이션 미스매치가 계속 발생한다면:

1. **스토어를 클라이언트 전용으로 설정**:

```tsx
// 완전한 클라이언트 전용 접근법 (서버에서는 렌더링하지 않음)
"use client";

import dynamic from "next/dynamic";

// 클라이언트에서만 로드되는 컴포넌트 (SSR 없음)
const ClientOnlyCounter = dynamic(() => import("./Counter"), {
  ssr: false,
  loading: () => <div>로딩 중...</div>,
});

export default function CounterPage() {
  return (
    <div>
      <h1>카운터 페이지</h1>
      <ClientOnlyCounter />
    </div>
  );
}
```

2. **초기값 동기화 확인**: 서버의 초기값과 클라이언트의 초기값이 반드시 일치해야 합니다.

3. **디버깅 모드 사용**:

```tsx
// 스토어 생성 시 디버깅 활성화
export const useCounterStore = createPersistStore(
  ...,
  {
    name: "counter-storage",
    // 디버깅을 위해 콘솔에 로그 출력
    onRehydrateStorage: (state) => {
      console.log('하이드레이션 상태:', state);
      return (error) => {
        if (error) {
          console.error('하이드레이션 오류:', error);
        } else {
          console.log('하이드레이션 성공');
        }
      };
    }
  }
);
```

4. **클라이언트 사이드에서만 스토어에 접근**:

```tsx
// CounterPage.tsx
"use client";

import { useState, useEffect } from "react";
import { useCounterStore } from "./store";

function CounterPage() {
  // 마운트 및 하이드레이션 완료 상태 추적
  const [isReady, setIsReady] = useState(false);

  // 스토어 상태를 직접 리턴하는 대신, 로컬 상태에 복사
  const [count, setCount] = useState(0);

  // 클라이언트 측에서만 스토어 접근
  useEffect(() => {
    // 1. 마운트 시점에 스토어 상태 가져오기
    const { count, increment, decrement } = useCounterStore.getState();
    setCount(count);

    // 2. 하이드레이션 상태 추적
    const unsubHydration = useCounterStore.persist?.onHydrate(() => {
      setIsReady(true);
    });

    // 3. 스토어 변경 구독
    const unsubStore = useCounterStore.subscribe((state) => {
      setCount(state.count);
    });

    // 정리 함수
    return () => {
      unsubStore();
      unsubHydration && unsubHydration();
    };
  }, []);

  // 로딩 상태 표시
  if (!isReady) {
    return <div>로딩 중...</div>;
  }

  // 하이드레이션 완료 후 렌더링
  return (
    <div>
      <h1>카운터: {count}</h1>
      <button onClick={() => useCounterStore.getState().increment()}>
        증가
      </button>
      <button onClick={() => useCounterStore.getState().decrement()}>
        감소
      </button>
    </div>
  );
}
```

5. **가장 확실한 해결책: Next.js의 `useEffect` 내에서만 스토어 접근**:

```tsx
"use client";

import { useEffect, useState } from "react";
import { useCounterStore } from "./store";

export default function CounterPage() {
  // 컴포넌트 로컬 상태 사용
  const [count, setCount] = useState(0);
  const [isClient, setIsClient] = useState(false);

  // 서버 사이드 렌더링 시에는 스토어에 접근하지 않음
  useEffect(() => {
    // 클라이언트 측에서만 스토어 접근
    setIsClient(true);
    setCount(useCounterStore.getState().count);

    // 스토어 변경 구독
    return useCounterStore.subscribe((state) => setCount(state.count));
  }, []);

  // 인터랙션도 클라이언트에서만 가능
  const increment = () => {
    if (isClient) {
      useCounterStore.getState().increment();
    }
  };

  const decrement = () => {
    if (isClient) {
      useCounterStore.getState().decrement();
    }
  };

  return (
    <div>
      <h1>카운터: {count}</h1>
      <button onClick={increment}>증가</button>
      <button onClick={decrement}>감소</button>
    </div>
  );
}
```

이러한 패턴들을 사용하면 Next.js의 서버 컴포넌트, 클라이언트 컴포넌트와 함께 하이드레이션 미스매치 없이 안정적으로 HSC-Store를 사용할 수 있습니다.

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
- `_timeTravel.getHistory()`: 전체's 히스토리 데이터 가져오기
- `_timeTravel.getCurrentIndex()`: 현재 상태 인덱스 가져오기
- `_timeTravel.clearHistory()`: 히스토리 초기화

### `schemaMiddleware(options)`

스키마 기반 상태 유효성 검사 기능을 추가합니다.

- `schema`: 각 필드별 검증 규칙 정의
  - `type`: 필드 타입 검사 ('string', 'number', 'boolean', 'array', 'object')
  - `required`: 필수 필드 여부
  - `validate`: 커스텀 유효성 검사 함수
  - `errorMessage`: 에러 메시지
- `onError`: 유효성 검사 실패 시 호출될 콜백
- `strict`: true일 경우 유효하지 않은 상태 변경 차단

API:

- `_validation.validateState()`: 현재 상태의 유효성 검사 실행
- `_validation.getSchema()`: 현재 적용 중인 스키마 가져오기

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
- `hydrate(serverState)`: SSR을 위한 서버 상태 하이드레이션

### 영구 저장 API

- `persist.getOptions()`: 현재 persist 옵션 가져오기
- `persist.rehydrate()`: 수동으로 상태 복원 실행
- `persist.hasHydrated()`: 하이드레이션 완료 여부 확인
- `persist.onHydrate`: 하이드레이션 완료 콜백
- `persist.clearStorage()`: 저장된 상태 제거

## 📄 라이선스

MIT ©

## ✅ Zustand에는 없는 추가 기능들

HSC-Store는 Zustand의 간결함을 유지하면서도 Zustand에서 제공하지 않는 몇 가지 강력한 기능을 추가로 제공합니다.

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
  const timeTravel = useCounterStore._timeTravel;
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

### 2. 스키마 검증 (Schema Validation)

상태가 항상 유효한 형태인지 확인할 수 있는 스키마 기반 검증 시스템을 제공합니다.

```typescript
import { createStore, schemaMiddleware } from "hsc-store";

// 스키마 검증 미들웨어 적용
const useUserStore = createStore(
  schemaMiddleware({
    schema: {
      name: {
        type: "string",
        required: true,
        errorMessage: "이름은 필수 항목입니다",
      },
      age: {
        type: "number",
        validate: (value) => value >= 0 && value <= 120,
        errorMessage: "나이는 0에서 120 사이여야 합니다",
      },
      email: {
        type: "string",
        validate: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
        errorMessage: "유효한 이메일 형식이 아닙니다",
      },
    },
    onError: (errors) => {
      console.error("상태 유효성 오류:", errors);
      // 또는 토스트 메시지 표시 등
    },
    strict: true, // true면 오류 시 상태 변경 차단
  })((set) => ({
    name: "",
    age: 0,
    email: "",
    setUser: (user) => set(user),
  }))
);

// 사용 예시
function UserForm() {
  const { name, age, email, setUser } = useUserStore();
  const [formData, setFormData] = useState({ name, age, email });

  const handleSubmit = (e) => {
    e.preventDefault();
    // 자동으로 스키마 검증이 이루어집니다
    setUser(formData);
  };

  // 언제든지 현재 상태의 유효성 확인 가능
  const errors = useUserStore._validation.validateState();
  const isValid = errors.length === 0;

  return (
    <form onSubmit={handleSubmit}>
      {/* 폼 필드들... */}
      <button type="submit" disabled={!isValid}>
        저장
      </button>
      {errors.length > 0 && (
        <div className="errors">
          {errors.map((err, i) => (
            <p key={i} className="error">
              {err.message}
            </p>
          ))}
        </div>
      )}
    </form>
  );
}
```

### 3. 파생 상태 (Computed State)

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
useCartStore._computed.recompute("totalPrice");

// 모든 계산값 재계산하기
useCartStore._computed.recomputeAll();

// 계산된 상태를 포함한 전체 상태 가져오기
const stateWithComputed = useCartStore._computed.getStateWithComputed();

// 혹은 프록시를 통해 계산된 상태에 직접 접근하기
const stateProxy = useCartStore.getStateWithComputed();
console.log(stateProxy.totalPrice); // 계산된 값을 반환합니다
```
