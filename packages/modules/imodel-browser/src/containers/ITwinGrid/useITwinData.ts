/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/
import React from "react";

import {
  ApiOverrides,
  DataStatus,
  ITwinFilterOptions,
  ITwinFull,
  ITwinSubClass,
} from "../../types";
import { _getAPIServer } from "../../utils/_apiOverrides";
import { useITwinFilter } from "./useITwinFilter";

export interface ProjectDataHookOptions {
  requestType?: "favorites" | "recents" | "";
  iTwinSubClass?: ITwinSubClass;
  accessToken?: string | (() => Promise<string>) | undefined;
  apiOverrides?: ApiOverrides<ITwinFull[]>;
  filterOptions?: ITwinFilterOptions;
  orderbyOptions?: string;
  shouldRefetchFavorites?: boolean;
  resetShouldRefetchFavorites?: () => void;
}

const PAGE_SIZE = 100;

export const useITwinData = ({
  requestType = "",
  iTwinSubClass = "Project",
  accessToken,
  apiOverrides,
  filterOptions,
  orderbyOptions,
  shouldRefetchFavorites,
  resetShouldRefetchFavorites,
}: ProjectDataHookOptions) => {
  const data = apiOverrides?.data;
  const serverEnvironmentPrefix = apiOverrides?.serverEnvironmentPrefix;
  const [projects, setProjects] = React.useState<ITwinFull[]>([]);
  const [status, setStatus] = React.useState<DataStatus>();
  const filteredProjects = useITwinFilter(projects, filterOptions);
  const [page, setPage] = React.useState(0);
  const [morePages, setMorePages] = React.useState(true);

  const refetchData = React.useCallback(() => {
    setStatus(DataStatus.Fetching);
    setProjects([]);
    setPage(0);
    setMorePages(true);
  }, []);

  const fetchMore = React.useCallback(() => {
    setPage((page) => page + 1);
  }, []);

  const morePagesRef = React.useRef(morePages);
  morePagesRef.current = morePages;

  React.useEffect(() => {
    // If filter changes but we already have all the data for favorites or recents,
    // let client side filtering do its job, otherwise, refetch from scratch.
    // Use ref so "morePages" changes itself does not trigger the effect.
    if (
      morePagesRef.current ||
      !["favorites", "recents"].includes(requestType)
    ) {
      refetchData();
    }
  }, [filterOptions, requestType, refetchData]);

  React.useEffect(() => {
    // If any of the dependencies change, always restart the fetch from scratch.
    refetchData();
  }, [
    accessToken,
    requestType,
    iTwinSubClass,
    orderbyOptions,
    data,
    serverEnvironmentPrefix,
    refetchData,
  ]);

  React.useEffect(() => {
    if (!morePages) {
      return;
    }
    if (data) {
      setProjects(data);
      setStatus(DataStatus.Complete);
      setMorePages(false);
      return;
    }
    if (!accessToken) {
      setStatus(DataStatus.TokenRequired);
      setProjects([]);
      return;
    }
    if (page === 0) {
      setStatus(DataStatus.Fetching);
    }
    const abortController = new AbortController();
    const endpoint = ["favorites", "recents"].includes(requestType)
      ? requestType
      : "";
    const resolvedITwinSubClass = iTwinSubClass === "All" ? "" : iTwinSubClass;
    const subClass = `?subClass=${resolvedITwinSubClass}`;
    const paging = `&$skip=${page * PAGE_SIZE}&$top=${PAGE_SIZE}`;
    const search =
      ["favorites", "recents"].includes(requestType) || !filterOptions
        ? ""
        : `&$search=${encodeURIComponent(String(filterOptions).trim())}`;
    const orderby =
      ["favorites", "recents"].includes(requestType) || !orderbyOptions
        ? ""
        : `&$orderby=${encodeURIComponent(String(orderbyOptions).trim())}`;

    const url = `${_getAPIServer(
      serverEnvironmentPrefix
    )}/itwins/${endpoint}${subClass}${paging}${search}${orderby}`;

    const makeFetchRequest = async () => {
      const options: RequestInit = {
        signal: abortController.signal,
        headers: {
          "Cache-Control":
            requestType === "favorites" && shouldRefetchFavorites
              ? "no-cache"
              : "",
          Authorization:
            typeof accessToken === "function"
              ? await accessToken()
              : accessToken,
          Accept: "application/vnd.bentley.itwin-platform.v1+json",
          Prefer: "return=representation",
        },
      };

      const response = await fetch(url, options);
      const result: { iTwins: ITwinFull[] } = response.ok
        ? await response.json()
        : await response.text().then((errorText) => {
            throw new Error(errorText);
          });
      setStatus(DataStatus.Complete);
      requestType === "favorites" && resetShouldRefetchFavorites?.();
      if (result.iTwins.length !== PAGE_SIZE) {
        setMorePages(false);
      }
      setProjects((projects) =>
        page === 0 ? result.iTwins : [...projects, ...result.iTwins]
      );
    };

    makeFetchRequest().catch((e) => {
      if (e.name === "AbortError") {
        // Aborting because unmounting is not an error, swallow.
        return;
      }
      setProjects([]);
      setStatus(DataStatus.FetchFailed);
      console.error(e);
    });
    return () => {
      abortController.abort();
    };
  }, [
    accessToken,
    requestType,
    data,
    serverEnvironmentPrefix,
    filterOptions,
    orderbyOptions,
    page,
    morePages,
    iTwinSubClass,
    shouldRefetchFavorites,
    resetShouldRefetchFavorites,
  ]);
  return {
    iTwins: filteredProjects,
    status,
    fetchMore: morePages ? fetchMore : undefined,
    refetchITwins: refetchData,
  };
};
