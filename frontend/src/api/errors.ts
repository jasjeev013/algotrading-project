import axios from "axios";
import type { ApiErrorResponse } from "../types/api";

export function extractErrorDetail(err: unknown, fallback: string): string {
  if (axios.isAxiosError<ApiErrorResponse>(err)) {
    return err.response?.data?.detail || fallback;
  }
  return fallback;
}
