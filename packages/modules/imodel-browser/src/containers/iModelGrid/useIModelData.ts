/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/
import React, { useEffect } from "react";

import {
  ApiOverrides,
  DataStatus,
  IModelFull,
  IModelSortOptions,
  ViewType,
} from "../../types";
import { _getAPIServer } from "../../utils/_apiOverrides";
import { useIModelSort } from "./useIModelSort";

export interface IModelDataHookOptions {
  iTwinId?: string | undefined;
  accessToken?: string | (() => Promise<string>) | undefined;
  sortOptions?: IModelSortOptions;
  apiOverrides?: ApiOverrides<IModelFull[]>;
  searchText?: string | undefined;
  maxCount?: number;
  pageSize?: number;
  /** @deprecated in 2.1 It is no longer used as it has no effect on the data fetching. */
  viewMode?: ViewType;
}
export const DEFAULT_PAGE_SIZE = 100;

export const useIModelData = ({
  iTwinId,
  accessToken,
  sortOptions,
  apiOverrides,
  searchText,
  pageSize = DEFAULT_PAGE_SIZE,
  maxCount,
}: IModelDataHookOptions) => {
  const [needsUpdate, setNeedsUpdate] = React.useState(true);
  const [iModels, setIModels] = React.useState<IModelFull[]>([]);
  const [status, setStatus] = React.useState<DataStatus>();
  const [page, setPage] = React.useState(0);
  const [morePagesAvailable, setMorePagesAvailable] = React.useState(true);
  const [abortController, setAbortController] = React.useState<
    AbortController | undefined
  >(undefined);

  const sortType =
    sortOptions && ["name", "createdDateTime"].includes(sortOptions.sortType)
      ? sortOptions.sortType
      : undefined; //Only available sort-by API at the moment.
  const [previousSortOptions, setPreviousSortOptions] = React.useState<
    IModelSortOptions | undefined
  >(sortOptions && { ...sortOptions });
  const sortDescending = sortOptions?.descending;
  const sortedIModels = useIModelSort(iModels, sortOptions);
  const sortChanged =
    sortOptions?.descending !== previousSortOptions?.descending ||
    sortOptions?.sortType !== previousSortOptions?.sortType;
  if (sortChanged) {
    setPreviousSortOptions(sortOptions);
  }

  // cleanup the abort controller when unmounting
  useEffect(() => () => abortController?.abort(), [abortController]);

  const reset = React.useCallback(() => {
    setStatus(DataStatus.Fetching);
    setIModels([]);
    setPage(0);
    setMorePagesAvailable(true);
    setNeedsUpdate(true);
  }, []);

  const fetchMore = React.useCallback(() => {
    if (
      needsUpdate ||
      status === DataStatus.Fetching ||
      status === DataStatus.TokenRequired ||
      status === DataStatus.ContextRequired ||
      !morePagesAvailable
    ) {
      return;
    }
    setPage(page + 1);
    setNeedsUpdate(true);
  }, [needsUpdate, status, morePagesAvailable, page]);

  React.useEffect(() => {
    // start from scratch when any external state changes
    reset();
  }, [
    iTwinId,
    accessToken,
    sortOptions?.descending,
    sortOptions?.sortType,
    apiOverrides?.data,
    apiOverrides?.serverEnvironmentPrefix,
    searchText,
    pageSize,
    maxCount,
    reset,
  ]);

  // Main function
  React.useEffect(() => {
    if (!needsUpdate) {
      return;
    }

    setNeedsUpdate(false);
    abortController?.abort();
    setAbortController(undefined);

    // if data is provided, use it and skip fetching
    if (apiOverrides?.data) {
      setIModels(apiOverrides.data);
      setStatus(DataStatus.Complete);
      setMorePagesAvailable(false);
      return;
    }

    if (!accessToken || !iTwinId) {
      setStatus(
        !accessToken ? DataStatus.TokenRequired : DataStatus.ContextRequired
      );
      setIModels([]);
      return;
    }

    // If sort changes but we already have all the data, let client side sorting do its job
    if (sortChanged && !morePagesAvailable) {
      setStatus(DataStatus.Complete);
      return;
    }

    // Otherwise, fetch from server
    setStatus(DataStatus.Fetching);

    const { abortController: newAbortController, fetchIModels } =
      createFetchIModelsFn(
        iTwinId,
        accessToken,
        sortType,
        sortDescending ?? false,
        page,
        searchText,
        pageSize,
        maxCount,
        apiOverrides?.serverEnvironmentPrefix
      );
    setAbortController(newAbortController);

    fetchIModels()
      .then(({ iModels, morePagesAvailable }) => {
        setMorePagesAvailable(morePagesAvailable);
        setIModels((prev) =>
          page === 0 ? [...iModels] : [...prev, ...iModels]
        );
        setStatus(DataStatus.Complete);
      })
      .catch((e) => {
        if (e.name === "AbortError") {
          // Aborting because unmounting is not an error, swallow.
          return;
        }
        setIModels([]);
        setMorePagesAvailable(false);
        setStatus(DataStatus.FetchFailed);
        console.error(e);
      });
  }, [
    abortController,
    accessToken,
    apiOverrides?.data,
    apiOverrides?.serverEnvironmentPrefix,
    iModels,
    iTwinId,
    maxCount,
    pageSize,
    morePagesAvailable,
    needsUpdate,
    page,
    searchText,
    sortChanged,
    sortDescending,
    sortType,
  ]);

  return {
    iModels: sortedIModels,
    status,
    fetchMore: morePagesAvailable ? fetchMore : undefined,
    refetchIModels: reset,
  };
};

const createFetchIModelsFn = (
  iTwinId: string,
  accessToken: string | (() => Promise<string>),
  sortType: string | undefined,
  sortDescending: boolean,
  page: number,
  searchText: string | undefined,
  pageSize: number = DEFAULT_PAGE_SIZE,
  maxCount: number | undefined,
  serverEnvironmentPrefix?: "" | "dev" | "qa"
): {
  abortController: AbortController;
  fetchIModels: () => Promise<{
    iModels: IModelFull[];
    morePagesAvailable: boolean;
  }>;
} => {
  const selection = `?iTwinId=${encodeURIComponent(iTwinId)}`;
  const sorting = sortType
    ? `&$orderBy=${encodeURIComponent(sortType)} ${
        sortDescending ? "desc" : "asc"
      }`
    : "";
  const skip = page * pageSize;

  if (maxCount !== undefined && skip >= maxCount) {
    const abortController = new AbortController();
    return {
      abortController,
      fetchIModels: async () => ({
        iModels: [],
        morePagesAvailable: false,
      }),
    };
  }

  const top = maxCount ? Math.min(pageSize, maxCount - skip) : pageSize;
  const paging = `&$skip=${skip}&$top=${top}`;
  const searching = searchText?.trim()
    ? `&$search=${encodeURIComponent(searchText)}`
    : "";

  const abortController = new AbortController();
  const url = `${_getAPIServer(
    serverEnvironmentPrefix
  )}/imodels/${selection}${sorting}${paging}${searching}`;

  const doFetchRequest = async () => {
    const options: RequestInit = {
      signal: abortController.signal,
      headers: {
        Authorization:
          typeof accessToken === "function" ? await accessToken() : accessToken,
        Prefer: "return=representation",
        Accept: "application/vnd.bentley.itwin-platform.v2+json",
      },
    };

    const response = await fetch(url, options);
    if (!response.ok) {
      throw new Error(await response.text());
    }

    const result: { iModels: IModelFull[] } = await response.json();
    const totalLocalIModels = page * pageSize + result.iModels.length;

    return {
      iModels: result.iModels,
      morePagesAvailable: !(
        totalLocalIModels === maxCount || result.iModels.length < top
      ),
    };
  };

  return {
    abortController,
    fetchIModels: doFetchRequest,
  };
};
