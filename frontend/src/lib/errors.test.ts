import { describe, expect, it } from "vitest";
import axios, { AxiosError, AxiosHeaders } from "axios";
import { getErrorMessage } from "./errors";

function httpError(status: number, data: unknown) {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError("failed", undefined, config, undefined, { status, data, statusText: "", headers: {}, config });
}

describe("getErrorMessage", () => {
  it("shows FastAPI's string detail as is", () => {
    expect(getErrorMessage(httpError(404, { detail: "Paper not found." }))).toBe("Paper not found.");
  });

  it("joins 422 validation issues with their field names", () => {
    const detail = [
      { loc: ["body", "query"], msg: "String should have at least 1 character" },
      { msg: "Bad input" },
    ];
    expect(getErrorMessage(httpError(422, { detail }))).toBe(
      "query: String should have at least 1 character; Bad input",
    );
  });

  it("falls back to the status code when there is no detail", () => {
    expect(getErrorMessage(httpError(500, "<html>"))).toBe("Request failed (HTTP 500).");
  });

  it("tells timeouts apart from an unreachable backend", () => {
    expect(getErrorMessage(new AxiosError("timeout", "ECONNABORTED"))).toMatch(/timed out/);
    expect(getErrorMessage(new AxiosError("Network Error", "ERR_NETWORK"))).toMatch(/Couldn't reach the backend/);
  });

  it("reports a cancelled request as cancelled, not failed", () => {
    expect(getErrorMessage(new axios.CanceledError())).toBe("Request cancelled.");
  });

  it("handles plain errors and unknown values", () => {
    expect(getErrorMessage(new Error("boom"))).toBe("boom");
    expect(getErrorMessage("??")).toBe("Something went wrong.");
  });
});
