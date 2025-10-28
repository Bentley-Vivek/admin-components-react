/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/
import { renderHook } from "@testing-library/react-hooks";
import { rest } from "msw";
import { act } from "react";

import { server } from "../../tests/mocks/server";
import { DataStatus, IModelSortOptionsKeys } from "../../types";
import { useIModelData } from "./useIModelData";

describe("useIModelData hook", () => {
  // Establish API mocking before all tests.
  beforeAll(() => server.listen());
  // Reset any request handlers that we may add during the tests,
  // so they don't affect other tests.
  afterEach(() => server.resetHandlers());
  // Clean up after the tests are finished.
  afterAll(() => {
    server.close();
    jest.clearAllMocks();
  });

  it("returns the data and proper status on successful call", async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useIModelData({ iTwinId: "iTwinId", accessToken: "accessToken" })
    );

    await waitForNextUpdate();
    expect(result.current.iModels).toContainEqual({
      id: "fakeId",
      displayName: "fakeName",
    });
    expect(result.current.status).toEqual(DataStatus.Complete);
  });

  it("request the sort order the data and proper status on successful call", async () => {
    const { result, waitForNextUpdate } = renderHook(() =>
      useIModelData({
        iTwinId: "iTwinId",
        accessToken: "accessToken",
        sortOptions: { sortType: "name", descending: true },
      })
    );

    await waitForNextUpdate();
    expect(result.current.iModels).toContainEqual({
      id: "fakeId",
      displayName: "nameDescOrdered",
    });
    expect(result.current.status).toEqual(DataStatus.Complete);
  });

  it("returns error status and no data on failure", async () => {
    server.use(
      rest.get("https://api.bentley.com/imodels/", (req, res, ctx) => {
        return res(ctx.status(401));
      })
    );

    const { result, waitForValueToChange } = renderHook(() =>
      useIModelData({ iTwinId: "iTwinId", accessToken: "accessToken" })
    );

    await waitForValueToChange(() => result.current.status);
    expect(result.current.iModels).toEqual([]);
    expect(result.current.status).toEqual(DataStatus.FetchFailed);
  });

  it("returns apiOverrides.data without fetching when it is provided", async () => {
    const data = [{ id: "rerenderedId", displayName: "rerenderedDisplayName" }];
    const watcher = jest.fn();
    server.use(
      rest.get("https://api.bentley.com/imodels/", (req, res, ctx) => {
        watcher();
        return res(ctx.status(200), ctx.json({ iModels: [] }));
      })
    );

    const { result, rerender, waitForNextUpdate } = renderHook<
      Parameters<typeof useIModelData>,
      ReturnType<typeof useIModelData>
    >((initialValue) => useIModelData(...initialValue), {
      initialProps: [{ iTwinId: "iTwinId", accessToken: "accessToken" }],
    });

    await waitForNextUpdate();

    expect(result.current.iModels).toEqual([]);
    expect(result.current.status).toEqual(DataStatus.Complete);
    expect(result.current.fetchMore).toBeUndefined();
    expect(watcher).toHaveBeenCalledTimes(1);

    rerender([
      {
        apiOverrides: {
          data,
        },
      },
    ]);

    expect(result.current.iModels).toEqual([
      { id: "rerenderedId", displayName: "rerenderedDisplayName" },
    ]);
    expect(result.current.status).toEqual(DataStatus.Complete);
    expect(watcher).toHaveBeenCalledTimes(1);

    rerender([{ iTwinId: "iTwinId", accessToken: "accessToken" }]);
    await waitForNextUpdate();

    expect(result.current.iModels).toEqual([]);
    expect(result.current.status).toEqual(DataStatus.Complete);
    expect(result.current.fetchMore).toBeUndefined();
    expect(watcher).toHaveBeenCalledTimes(2);
  });

  it("returns proper error if no accessToken is provided without data override", async () => {
    const { result } = renderHook(() => useIModelData({ iTwinId: "iTwinId" }));

    expect(result.current.iModels).toEqual([]);
    expect(result.current.status).toEqual(DataStatus.TokenRequired);
  });

  it("returns proper error if no context is provided without data override", async () => {
    const { result } = renderHook(() =>
      useIModelData({ accessToken: "accessToken" })
    );

    expect(result.current.iModels).toEqual([]);
    expect(result.current.status).toEqual(DataStatus.ContextRequired);
  });

  it("apply sorting", async () => {
    const expectedSortOrder = ["2", "4", "5", "1", "3"];
    const options = {
      apiOverrides: {
        data: [
          {
            id: "1",
            displayName: "d",
            name: "c",
            description: "e",
            initialized: true,
            createdDateTime: "2020-09-05T12:42:51.593Z",
          },
          {
            id: "2",
            displayName: "a",
            name: "d",
            description: "d",
            initialized: true,
            createdDateTime: "2020-09-03T12:42:51.593Z",
          },
          {
            id: "3",
            displayName: "e",
            name: "a",
            description: "c",
            initialized: false,
            createdDateTime: "2020-09-04T12:42:51.593Z",
          },
          {
            id: "4",
            displayName: "b",
            name: "b",
            description: "b",
            initialized: false,
            createdDateTime: "2020-09-01T12:42:51.593Z",
          },
          {
            id: "5",
            displayName: "c",
            name: "d",
            description: "a",
            initialized: true,
            createdDateTime: "2020-09-02T12:42:51.593Z",
          },
        ],
      },
      sortOptions: {
        sortType: "displayName" as IModelSortOptionsKeys,
        descending: false,
      },
    };
    const { result } = renderHook(() => useIModelData(options));

    expect(result.current.iModels.map((iModel) => iModel.id)).toEqual(
      expectedSortOrder
    );
  });

  it("should call correct api when maxCount is provided", async () => {
    // Arrange
    const fetchSpy = jest.spyOn(window, "fetch");

    let callNum = 0;
    const mockIModels = Array.from({ length: 110 }, (_, i) => ({
      id: `fakeId${i + 1}`,
      displayName: `fakeName${i + 1}`,
    }));

    const watcher = jest.fn();
    server.use(
      rest.get("https://api.bentley.com/imodels/", (req, res, ctx) => {
        watcher();
        return res(
          ctx.json({
            iModels:
              ++callNum === 1
                ? mockIModels.slice(0, 100)
                : mockIModels.slice(100),
          })
        );
      })
    );

    // Act
    const { result, waitForValueToChange } = renderHook(() =>
      useIModelData({
        iTwinId: "iTwinId",
        accessToken: "accessToken",
        maxCount: 110,
      })
    );
    await waitForValueToChange(
      () => result.current.status === DataStatus.Complete
    );

    act(() => result.current.fetchMore?.());
    await waitForValueToChange(
      () => result.current.status === DataStatus.Complete
    );

    // Assert
    const opts = {
      headers: {
        Accept: "application/vnd.bentley.itwin-platform.v2+json",
        Authorization: "accessToken",
        Prefer: "return=representation",
      },
      signal: new AbortController().signal,
    };

    expect(result.current.status).toEqual(DataStatus.Complete);
    expect(result.current.fetchMore).toBeUndefined();
    expect(watcher).toBeCalledTimes(2);
    expect(fetchSpy).toHaveBeenNthCalledWith(
      fetchSpy.mock.calls.length - 1,
      "https://api.bentley.com/imodels/?iTwinId=iTwinId&$skip=0&$top=100",
      opts
    );
    expect(fetchSpy).toHaveBeenLastCalledWith(
      "https://api.bentley.com/imodels/?iTwinId=iTwinId&$skip=100&$top=10",
      opts
    );
  });

  it("should call correct api when pageSize is provided", async () => {
    const fetchSpy = jest.spyOn(window, "fetch");

    const mockIModels = Array.from({ length: 110 }, (_, i) => ({
      id: `fakeId${i + 1}`,
      displayName: `fakeName${i + 1}`,
    }));

    const watcher = jest.fn();
    server.use(
      rest.get("https://api.bentley.com/imodels/", (req, res, ctx) => {
        watcher();
        return res(
          ctx.json({
            iModels: mockIModels,
          })
        );
      })
    );

    const { result, waitForValueToChange } = renderHook(() =>
      useIModelData({
        iTwinId: "iTwinId",
        accessToken: "accessToken",
        pageSize: 110,
      })
    );

    await waitForValueToChange(
      () => result.current.status === DataStatus.Complete
    );

    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.stringContaining(`$skip=0`) && expect.stringContaining(`$top=110`),
      expect.any(Object)
    );
    expect(result.current.iModels.length).toBe(110);
    expect(watcher).toHaveBeenCalledTimes(1);
  });

  it("returns properly paged iModels", async () => {
    const fetchSpy = jest.spyOn(window, "fetch");

    let callNum = 0;
    const mockIModels = Array.from({ length: 101 }, (_, i) => ({
      id: `fakeId${i + 1}`,
      displayName: `fakeName${i + 1}`,
    }));

    const watcher = jest.fn();
    server.use(
      rest.get("https://api.bentley.com/imodels/", (req, res, ctx) => {
        watcher();
        return res(
          ctx.json({
            iModels:
              ++callNum === 1
                ? mockIModels.slice(0, 100)
                : mockIModels.slice(100),
          })
        );
      })
    );

    const { result, waitForValueToChange } = renderHook(() =>
      useIModelData({
        iTwinId: "iTwinId",
        accessToken: "accessToken",
      })
    );

    await waitForValueToChange(
      () => result.current.status === DataStatus.Complete
    );

    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.stringContaining(`$skip=0`) && expect.stringContaining(`$top=100`),
      expect.any(Object)
    );
    expect(result.current.iModels.length).toBe(100);
    expect(result.current.fetchMore).toBeDefined();
    expect(watcher).toHaveBeenCalledTimes(1);

    act(() => result.current.fetchMore?.());
    await waitForValueToChange(
      () => result.current.status === DataStatus.Complete
    );

    expect(fetchSpy).toHaveBeenLastCalledWith(
      expect.stringContaining(`$skip=100`) &&
        expect.stringContaining(`$top=100`),
      expect.any(Object)
    );
    expect(result.current.iModels.length).toBe(101);
    expect(result.current.fetchMore).toBeUndefined();
    expect(watcher).toHaveBeenCalledTimes(2);
  });

  it.each([
    {
      missing: "accessToken",
      initialProps: { accessToken: undefined as any, iTwinId: "iTwinId" },
      supplyProps: { accessToken: "accessToken" },
    },
    {
      missing: "iTwinId",
      initialProps: { iTwinId: undefined as any, accessToken: "accessToken" },
      supplyProps: { iTwinId: "iTwinId" },
    },
  ])(
    "does not skip first page if fetchMore called before $missing becomes available",
    async ({ initialProps, supplyProps }) => {
      const fetchSpy = jest.spyOn(window, "fetch").mockImplementation(
        () =>
          Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                iModels: [{ id: "first", displayName: "first" }],
              }),
          }) as any
      );

      const { result, rerender, waitForNextUpdate } = renderHook(
        (props: any) =>
          useIModelData({
            iTwinId: (props as any).iTwinId,
            accessToken: (props as any).accessToken,
          }),
        { initialProps }
      );

      // Attempt pagination before prerequisite present
      act(() => result.current.fetchMore?.());

      // Provide missing prerequisite
      rerender({ ...initialProps, ...supplyProps });
      await waitForNextUpdate();

      const firstUrl = fetchSpy.mock.calls[0][0] as string;
      expect(firstUrl).toContain("$skip=0");
      expect(firstUrl).toContain("$top=100");
      expect(result.current.iModels[0]?.id).toBe("first");
    }
  );
});

it("fetches data with searchText", async () => {
  const fetchSpy = jest.spyOn(window, "fetch").mockImplementation(
    () =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ iModels: [] }),
      }) as any
  );
  const searchText = "testSearch";

  const { result, waitForNextUpdate } = renderHook(() =>
    useIModelData({
      iTwinId: "iTwinId",
      accessToken: "accessToken",
      searchText,
    })
  );

  await waitForNextUpdate();

  expect(result.current.status).toEqual(DataStatus.Complete);
  expect(fetchSpy).toHaveBeenCalledWith(
    expect.stringContaining(`&$search=${searchText}`),
    expect.any(Object)
  );
});

it("fetches data with serverEnvironmentPrefix", async () => {
  const fetchSpy = jest.spyOn(window, "fetch").mockImplementation(
    () =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ iModels: [] }),
      }) as any
  );
  const serverEnvironmentPrefix = "dev";

  const { result, waitForNextUpdate } = renderHook(() =>
    useIModelData({
      iTwinId: "iTwinId",
      accessToken: "accessToken",
      apiOverrides: {
        serverEnvironmentPrefix,
      },
    })
  );

  await waitForNextUpdate();

  expect(result.current.status).toEqual(DataStatus.Complete);
  expect(fetchSpy).toHaveBeenCalledWith(
    expect.stringContaining(`${serverEnvironmentPrefix}`),
    expect.any(Object)
  );
});

it("aborts previous fetch when new fetch is initiated", async () => {
  jest.spyOn(window, "fetch").mockImplementation(
    () =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ iModels: [] }),
      }) as any
  );
  const abortSpy = jest.spyOn(AbortController.prototype, "abort");

  const { rerender, waitForNextUpdate } = renderHook(
    ({ iTwinId, accessToken }) =>
      useIModelData({
        iTwinId,
        accessToken,
      }),
    {
      initialProps: { iTwinId: "iTwinId1", accessToken: "accessToken" },
    }
  );

  rerender({ iTwinId: "iTwinId2", accessToken: "accessToken" });
  await waitForNextUpdate();
  expect(abortSpy).toHaveBeenCalled();
});
