// 기본 상태 타입
export interface State {
  [key: string]: any;
}

// 상태 생성자 함수 타입
export type SetState<T extends State> = (
  partial: Partial<T> | ((state: T) => Partial<T>)
) => void;

// 스토어 생성자 함수 타입
export type Creator<T extends State> = (
  setState: SetState<T>,
  getState?: () => T
) => T;

// 미들웨어 타입 - 스토어 생성자를 받아 향상된 스토어 생성자를 반환
export type Middleware<T extends State> = (creator: Creator<T>) => Creator<T>;

// 영구 저장 옵션 타입
export interface PersistOptions<T extends State> {
  name: string; // 로컬 스토리지 키 이름
  storage?: Storage; // 저장소 (기본값: localStorage)
  partialize?: (state: T) => Partial<T>; // 특정 부분만 저장
  version?: number; // 버전 관리용
  migrate?: (persistedState: any, version: number) => T; // 마이그레이션 함수
  onRehydrateStorage?: (state: T | undefined) => void; // 복원 후 콜백
  skipHydration?: boolean; // 서버-클라이언트 하이드레이션 미스매치를 방지하기 위한 옵션
}

// 스토어 API 타입
export interface StoreApi<T extends State> {
  getState: () => T;
  setState: SetState<T>;
  subscribe: (callback: (state: T) => void) => () => void;
}

// 훅 타입
export interface UseStore<T extends State> {
  (): T;
  <U>(selector: (state: T) => U): U;
  getState: () => T;
  setState: SetState<T>;
  subscribe: (callback: (state: T) => void) => () => void;
  hydrate: (serverState: Partial<T>) => UseStore<T>;
}
