"use client";

import { State, Creator, UseStore } from "../types";
import React from "react";

// 미들웨어 타입 - 다양한 형태의 미들웨어를 처리할 수 있도록 함
type AnyMiddleware<T extends State> =
  | ((creator: Creator<T>) => Creator<T>)
  | ((set: any, get: any) => any)
  | any;

export const createStore = <T extends State>(
  creator: Creator<T>,
  middleware?: AnyMiddleware<T>[]
): UseStore<T> => {
  // 상태 및 리스너 초기화
  let state: T;
  const listeners = new Set<(state: T) => void>();

  // 상태 업데이트 함수
  const setState = (partial: Partial<T> | ((state: T) => Partial<T>)) => {
    // 새 상태 계산을 위한 부분 상태 추출
    // state가 undefined인 경우 빈 객체를 기본값으로 사용
    const partialState =
      typeof partial === "function"
        ? state !== undefined
          ? partial(state)
          : partial({} as T)
        : partial;

    // 상태가 undefined인 경우 초기화
    if (state === undefined) {
      state = { ...partialState } as T;
      listeners.forEach((listener) => listener(state));
      return;
    }

    // 실제 값 변경이 있는지 확인
    let hasChanged = false;
    for (const key in partialState) {
      if (
        Object.prototype.hasOwnProperty.call(partialState, key) &&
        !Object.is(state[key], partialState[key])
      ) {
        hasChanged = true;
        break;
      }
    }

    // 변경된 경우에만 상태 업데이트 및 리스너 호출
    if (hasChanged) {
      state = { ...state, ...partialState };
      listeners.forEach((listener) => listener(state));
    }
  };

  // 상태 접근 함수
  const getState = () => state;

  // 구독 함수
  const subscribe = (listener: (state: T) => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  // 미들웨어 적용
  let finalCreator = creator;

  if (middleware && middleware.length > 0) {
    // 미들웨어 역순으로 적용 (마지막이 가장 먼저 실행)
    for (let i = middleware.length - 1; i >= 0; i--) {
      const middlewareItem = middleware[i];

      try {
        // 미들웨어가 함수인 경우 적용
        if (typeof middlewareItem === "function") {
          // @ts-ignore - 다양한 형태의 미들웨어 지원
          finalCreator = middlewareItem(finalCreator);
        }
      } catch (e) {
        console.error("미들웨어 적용 오류:", e);
      }
    }
  }

  // 초기 상태 생성
  try {
    state = finalCreator(setState, getState);
  } catch (e) {
    console.error("스토어 초기화 오류:", e);
    // 폴백: 기본 creator 사용
    state = creator(setState, getState);
  }

  // 훅 함수 생성
  const useStore = <U = T>(selector?: (state: T) => U) => {
    // 상태 접근 함수
    const getSlice = () =>
      selector ? selector(getState()) : (getState() as any);
    // SSR용 서버 스냅샷 함수
    const getServerSnapshot = () =>
      selector ? selector(getState()) : (getState() as any);

    // 서버 환경 감지
    const isServer = typeof window === "undefined";

    // 서버에서는 단순히 현재 상태 반환 (useSyncExternalStore 사용 안함)
    if (isServer) {
      return getSlice();
    }

    // 클라이언트에서만 useSyncExternalStore 사용
    return React.useSyncExternalStore(subscribe, getSlice, getServerSnapshot);
  };

  // API 함수 추가
  useStore.getState = getState;
  useStore.setState = setState;
  useStore.subscribe = subscribe;

  // SSR 하이드레이션 함수 추가
  useStore.hydrate = (serverState: Partial<T>) => {
    setState(serverState);
    return useStore;
  };

  return useStore as UseStore<T>;
};
