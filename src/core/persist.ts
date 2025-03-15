"use client";

import { State, Creator, UseStore, PersistOptions } from "../types";
import { createStore } from "./createStore";
import React from "react";

export const createPersistStore = <T extends State>(
  creator: Creator<T>,
  persistOptions: PersistOptions<T>,
  middleware: any[] = []
): UseStore<T> => {
  // 기본 설정
  const {
    name,
    storage = typeof window !== "undefined" ? window.localStorage : undefined,
    partialize = (state) => {
      // 미들웨어 속성 제외하고 기본 데이터만 저장
      const result = { ...state };
      // 미들웨어 관련 속성 제외 (언더스코어로 시작하는 속성)
      Object.keys(result).forEach((key) => {
        if (key.startsWith("_") || typeof result[key] === "function") {
          delete result[key];
        }
      });
      console.log("[HSC-Store] 저장할 데이터:", result);
      return result;
    },
    version = 0,
    migrate = (state) => state as T,
    onRehydrateStorage,
    skipHydration = false,
  } = persistOptions;

  // 하이드레이션 상태 추적 - 스토어 인스턴스별로 독립적인 상태 유지
  const storeState = {
    isHydrated: false,
    isMounted: false,
  };

  // 기본 스토어 생성 (미들웨어 적용)
  const store = createStore<T>(creator, middleware);

  // 서버 환경이거나 스토리지가 없으면 원래 스토어 반환
  if (typeof window === "undefined" || !storage) {
    // 서버에서는 hydrate 함수만 추가하고 반환
    (store as any).hydrate = (serverState: Partial<T>) => {
      store.setState(serverState);
      return store;
    };

    // 서버 환경용 persist API 더미 추가
    (store as any).persist = {
      rehydrate: () => Promise.resolve(),
      hasHydrated: () => false,
      getOptions: () => persistOptions,
      onHydrate: onRehydrateStorage,
      clearStorage: () => {},
    };

    return store;
  }

  // 서버에서 생성된 초기 상태 저장
  const initialState = store.getState();

  // 원래 store의 set 함수 참조 저장
  const originalSet = store.setState;

  // 상태 저장 함수
  const persistState = (state: T) => {
    try {
      console.log("[HSC-Store] 저장 시도, 마운트 상태:", storeState.isMounted);
      // 마운트되지 않았거나 서버 환경 또는 스토리지가 없으면 저장하지 않음
      if (!storeState.isMounted || typeof window === "undefined" || !storage) {
        console.log("[HSC-Store] 저장 건너뜀:", {
          isMounted: storeState.isMounted,
          window: typeof window,
          storage: !!storage,
        });
        return;
      }

      // 상태를 설정된 storage(localStorage 또는 sessionStorage)에 저장
      const partialState = partialize(state);

      // 저장 내용 로깅
      const saveData = JSON.stringify({
        state: partialState,
        version,
      });
      console.log("[HSC-Store] 저장 데이터:", saveData);

      storage.setItem(name, saveData);
      console.log("[HSC-Store] 저장 완료:", name);
    } catch (e) {
      console.error("[HSC-Store] 상태 저장 오류:", e);
    }
  };

  // 상태 변경 감지를 위한 구독 설정 - 미들웨어와 독립적으로 작동
  const unsubscribe = store.subscribe((state) => {
    if (storeState.isMounted) {
      console.log("[HSC-Store] 상태 변경 감지, 저장 시도 (구독)");
      persistState(state);
    }
  });

  // set 함수 래핑 - 상태 변경 시 자동 저장 (백업 메커니즘)
  store.setState = ((updater: any) => {
    const result = originalSet(updater);
    // 구독 메커니즘이 실패할 경우를 대비한 백업
    if (storeState.isMounted) {
      console.log("[HSC-Store] setState 호출됨");
      // 이중 저장 방지를 위해 setTimeout 사용
      setTimeout(() => {
        console.log("[HSC-Store] 상태 변경 감지, 저장 시도 (setState)");
        persistState(store.getState());
      }, 0);
    }
    return result;
  }) as typeof store.setState;

  // 상태 복원 함수 - React 하이드레이션 후에 호출됨
  const rehydrate = async (): Promise<void> => {
    try {
      if (storeState.isHydrated || typeof window === "undefined") return;

      const persistedString = storage.getItem(name);
      if (!persistedString) {
        storeState.isHydrated = true;
        onRehydrateStorage?.(undefined);
        return;
      }

      const persistedState = JSON.parse(persistedString);

      // 버전 확인 및 마이그레이션
      const migratedState =
        persistedState.version === version
          ? persistedState.state
          : migrate(persistedState.state, persistedState.version);

      // 개발 모드에서 디버깅용 로그
      if (process.env.NODE_ENV !== "production") {
        console.log("[HSC-Store] 하이드레이션 완료:", name, migratedState);
      }

      // 상태 복원 - 원본 상태와 병합
      const restoredState = { ...initialState, ...migratedState };

      // 상태 업데이트 전에 하이드레이션 완료 표시
      storeState.isHydrated = true;

      // 상태 업데이트
      originalSet(restoredState as Partial<T>);

      // 콜백 실행
      onRehydrateStorage?.(store.getState());
    } catch (e) {
      console.error("상태 복원 오류:", e);
      storeState.isHydrated = true;
      onRehydrateStorage?.(undefined);
    }
  };

  // 기존 스토어 함수를 사용하는 래퍼 훅 생성
  const usePersistStore = <U = T>(selector?: (state: T) => U): U => {
    // React 하이드레이션 후 첫 렌더링에서 로컬 스토리지에서 상태 복원
    React.useEffect(() => {
      // 클라이언트에서 첫 마운트 시에만 실행
      if (!storeState.isMounted) {
        console.log("[HSC-Store] 컴포넌트 마운트됨");
        storeState.isMounted = true;

        // skipHydration이 false인 경우에만 자동 하이드레이션
        if (!skipHydration && !storeState.isHydrated) {
          rehydrate();
        }

        // 현재 상태를 즉시 저장 (재방문 시 복원 가능하도록)
        persistState(store.getState());
      }
    }, []);

    // 컴포넌트 언마운트 시 구독 해제
    React.useEffect(() => {
      return () => {
        // 모든 컴포넌트가 언마운트되면 구독 해제
        if (storeState.isMounted) {
          // 여기서는 구독을 유지하고, 앱이 종료될 때 자동으로 정리됨
        }
      };
    }, []);

    // 기본 훅 호출 - selector 처리
    return selector ? store(selector) : (store() as unknown as U);
  };

  // 원본 API 복사
  Object.keys(store).forEach((key) => {
    (usePersistStore as any)[key] = (store as any)[key];
  });

  // persist API 추가
  (usePersistStore as any).persist = {
    getOptions: () => persistOptions,
    rehydrate,
    hasHydrated: () => storeState.isHydrated,
    onHydrate: onRehydrateStorage,
    clearStorage: () => {
      if (!storage) return;
      try {
        storage.removeItem(name);
      } catch (e) {
        console.error("저장소 삭제 오류:", e);
      }
    },
    // 디버깅용 상태 확인 함수 추가
    getStoreState: () => ({ ...storeState }),
    // 강제 저장 함수 추가
    forceSave: () => {
      console.log("[HSC-Store] 강제 저장 시도");
      persistState(store.getState());
    },
  };

  // SSR 하이드레이션 함수 재정의
  (usePersistStore as any).hydrate = (serverState: Partial<T>) => {
    // 항상 서버 상태로 초기화 (로컬 스토리지와 관계없이)
    originalSet(serverState);
    return usePersistStore;
  };

  // 앱 종료 시 구독 해제를 위한 정리 함수 추가
  (usePersistStore as any).cleanup = () => {
    if (unsubscribe) {
      unsubscribe();
    }
  };

  return usePersistStore as UseStore<T>;
};

/**
 * 기존 스토어에 영구 저장 기능 추가 함수
 */
export const persist = <T extends State>(
  store: UseStore<T>,
  options: PersistOptions<T>
): UseStore<T> => {
  // 서버 환경이거나 스토리지가 없으면 원래 스토어 반환
  const storage =
    options.storage ||
    (typeof window !== "undefined" ? window.localStorage : undefined);

  if (!storage || typeof window === "undefined") return store;

  // 다른 설정들
  const {
    name,
    partialize = (state) => {
      // 미들웨어 속성 제외하고 기본 데이터만 저장
      const result = { ...state };
      // 미들웨어 관련 속성 제외 (언더스코어로 시작하는 속성)
      Object.keys(result).forEach((key) => {
        if (key.startsWith("_") || typeof result[key] === "function") {
          delete result[key];
        }
      });
      console.log("[HSC-Store] 저장할 데이터:", result);
      return result;
    },
    version = 0,
    migrate = (state) => state as T,
    onRehydrateStorage,
    skipHydration = false,
  } = options;

  // 하이드레이션 상태 추적
  let isHydrated = false;
  // 클라이언트 마운트 상태 추적
  let isMounted = false;

  // 서버에서 생성된 초기 상태 저장
  const initialState = store.getState();

  // 원래 store의 set 함수 참조
  const originalSet = store.setState;

  // 상태 저장 함수
  const persistState = (state: T) => {
    try {
      console.log("[HSC-Store] 저장 시도, 마운트 상태:", isMounted);
      // 마운트되지 않았거나 서버 환경에서는 저장하지 않음
      if (!isMounted || typeof window === "undefined") return;

      // skipHydration이 true여도 저장은 가능하도록 수정
      const partialState = partialize(state);
      storage.setItem(
        name,
        JSON.stringify({
          state: partialState,
          version,
        })
      );
    } catch (e) {
      console.error("상태 저장 오류:", e);
    }
  };

  // set 함수 래핑 - 상태 변경 시 자동 저장
  store.setState = ((updater: any) => {
    const result = originalSet(updater);
    // 클라이언트에서 마운트된 후에는 저장 (하이드레이션 여부와 관계없이)
    if (isMounted) {
      persistState(store.getState());
    }
    return result;
  }) as typeof store.setState;

  // 상태 복원 함수
  const rehydrate = async (): Promise<void> => {
    try {
      if (isHydrated || typeof window === "undefined") return;

      const persistedString = storage.getItem(name);
      if (!persistedString) {
        isHydrated = true;
        onRehydrateStorage?.(undefined);
        return;
      }

      const persistedState = JSON.parse(persistedString);

      // 버전 확인 및 마이그레이션
      const migratedState =
        persistedState.version === version
          ? persistedState.state
          : migrate(persistedState.state, persistedState.version);

      // 개발 모드에서 디버깅용 로그
      if (process.env.NODE_ENV !== "production") {
        console.log("[HSC-Store] 하이드레이션 완료:", name, migratedState);
      }

      // 상태 복원 - 원본 상태와 병합
      const restoredState = { ...initialState, ...migratedState };

      // 상태 업데이트 전에 하이드레이션 완료 표시
      isHydrated = true;

      // 상태 업데이트
      originalSet(restoredState as Partial<T>);

      // 콜백 실행
      onRehydrateStorage?.(store.getState());
    } catch (e) {
      console.error("상태 복원 오류:", e);
      isHydrated = true;
      onRehydrateStorage?.(undefined);
    }
  };

  // 기존 스토어 함수를 사용하는 래퍼 훅 생성
  const usePersistStore = <U = T>(selector?: (state: T) => U): U => {
    // isMounted 상태 추적 (React 하이드레이션 완료 여부)

    // React 하이드레이션 후 첫 렌더링에서 로컬 스토리지에서 상태 복원
    React.useEffect(() => {
      // 클라이언트에서 첫 마운트 시에만 실행
      if (!isMounted) {
        isMounted = true;

        // skipHydration이 false인 경우에만 자동 하이드레이션
        if (!skipHydration && !isHydrated) {
          rehydrate();
        }
      }
    }, []);

    // 기본 훅 호출 - selector 처리
    return selector ? store(selector) : (store() as unknown as U);
  };

  // 원본 API를 새 훅으로 복사
  Object.keys(store).forEach((key) => {
    (usePersistStore as any)[key] = (store as any)[key];
  });

  // persist API 추가
  (usePersistStore as any).persist = {
    getOptions: () => options,
    rehydrate,
    hasHydrated: () => isHydrated,
    onHydrate: onRehydrateStorage,
    clearStorage: () => {
      if (!storage) return;
      try {
        storage.removeItem(name);
      } catch (e) {
        console.error("저장소 삭제 오류:", e);
      }
    },
  };

  // 즉시 하이드레이션 시작하지 않음 - React 하이드레이션 후에 수행

  return usePersistStore as UseStore<T>;
};
