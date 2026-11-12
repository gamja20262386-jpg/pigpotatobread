// 화면 데이터 불러오기: loading / error / data / reload.
// key가 바뀌면 다시 부르고(null이면 부르지 않음), 마지막 요청 결과만 반영한다.
import { useCallback, useEffect, useRef, useState } from 'react';
import { errorText } from './api';

export function useResource<T>(key: string | null, load: () => Promise<T>) {
  const [state, setState] = useState<{ data?: T; error?: string; loading: boolean }>({ loading: key !== null });
  const loadRef = useRef(load);
  loadRef.current = load;
  const seq = useRef(0);
  const reload = useCallback(async () => {
    if (key === null) return;
    const n = ++seq.current;
    setState((s) => ({ ...s, loading: true, error: undefined }));
    try {
      const data = await loadRef.current();
      if (n === seq.current) setState({ data, loading: false });
    } catch (e) {
      if (n === seq.current) setState((s) => ({ data: s.data, error: errorText(e), loading: false }));
    }
  }, [key]);
  useEffect(() => {
    void reload();
  }, [reload]);
  const setData = useCallback((data: T) => setState({ data, loading: false }), []);
  return { ...state, reload, setData };
}

// 여러 화면이 같이 쓰는 값(하네스·LLM 상태)은 한 번만 부른다. 실패하면 다음에 다시 부른다.
const cache = new Map<string, Promise<unknown>>();
export function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key) as Promise<T> | undefined;
  if (hit) return hit;
  const p = load().catch((e: unknown) => {
    cache.delete(key);
    throw e;
  });
  cache.set(key, p);
  return p;
}
