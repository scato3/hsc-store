// jest-dom은 DOM 노드에 대한 assertion을 위한 확장 기능을 제공합니다.
import "@testing-library/jest-dom";

// localStorage 모킹
class LocalStorageMock {
  store: Record<string, string>;

  constructor() {
    this.store = {};
  }

  clear() {
    this.store = {};
  }

  getItem(key: string) {
    return this.store[key] || null;
  }

  setItem(key: string, value: string) {
    this.store[key] = String(value);
  }

  removeItem(key: string) {
    delete this.store[key];
  }

  get length() {
    return Object.keys(this.store).length;
  }

  key(index: number) {
    return Object.keys(this.store)[index] || null;
  }
}

// localStorage 모킹
Object.defineProperty(window, "localStorage", {
  value: new LocalStorageMock(),
});

// console.log 모킹 (테스트 출력을 깔끔하게 유지)
const originalConsoleLog = console.log;
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeAll(() => {
  console.log = jest.fn();
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterAll(() => {
  console.log = originalConsoleLog;
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// 각 테스트 후 localStorage 초기화
afterEach(() => {
  window.localStorage.clear();
});
