import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { AxiosError, AxiosHeaders } from "axios";
import { getMe } from "../../api/endpoints";
import { Login } from "../../pages/Login";
import { RequireAuth } from "./RequireAuth";

vi.mock("../../api/endpoints", () => ({ getMe: vi.fn() }));

function renderProtectedPage() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/workspace"]}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<RequireAuth />}>
            <Route path="/workspace" element={<p>Workspace</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("RequireAuth", () => {
  it("sends a logged-out visitor to the login page without an error", async () => {
    const config = { headers: new AxiosHeaders() };
    vi.mocked(getMe).mockRejectedValue(
      new AxiosError("401", undefined, config, undefined, { status: 401, data: {}, statusText: "", headers: {}, config }),
    );
    renderProtectedPage();
    expect(await screen.findByRole("heading", { name: "Log in" })).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("still shows the login page when the backend can't be reached, and says why", async () => {
    vi.mocked(getMe).mockRejectedValue(new AxiosError("Network Error", "ERR_NETWORK"));
    renderProtectedPage();
    expect(await screen.findByRole("heading", { name: "Log in" })).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toMatch(/Couldn't reach the backend/);
  });
});
