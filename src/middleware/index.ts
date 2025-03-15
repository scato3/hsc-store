export * from "./timeTravel";
export * from "./computed";

import { computedMiddleware } from "./computed";
import { timeTravelMiddleware } from "./timeTravel";

// 미들웨어 배열 래퍼 함수들
export const createMiddlewareArray = () => {
  return {
    // 컴퓨티드 미들웨어 래퍼
    computed: () => (creator: any) => {
      return computedMiddleware({ computed: {} })(creator);
    },

    // 타임트래블 미들웨어 래퍼
    timeTravel: (options: any) => (creator: any) => {
      return timeTravelMiddleware(options)(creator);
    },
  };
};
