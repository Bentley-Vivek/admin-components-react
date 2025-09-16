/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/

import { CellProps } from "react-table";

/** Full representation of the iModel. */
export interface IModelFull {
  /** "Globally Unique Identifier of the iModel" */
  id: string;

  /** "Display name of the iModel. Corresponds to Name property." */
  displayName?: string;

  /** "Name of the iModel." */
  name?: string;

  /** "Description of the iModel." */
  description?: string | null;

  /** "Enum flag indicating when iModel is ready to be used." */
  state?: "initialized" | "notInitialized";

  /** "Date when the iModel was created." */
  createdDateTime?: string;

  /** "Globally Unique Identifier of the iTwin that iModel belongs to. Only present if iModel belongs to the iTwin." */
  iTwinId?: string;

  /** "Globally Unique Identifier of the asset that iModel belongs to. Only present if iModel belongs to the asset." */
  assetId?: string;

  /** Thumbnail for the iModel */
  thumbnail?: string;
}

/** Full representation of an iTwin */
export interface ITwinFull {
  id: string;
  class?: ITwinClassType;
  subClass?: ITwinSubClass;
  type?: string;
  number?: string;
  displayName?: string;
  geographicLocation?: string;
  latitude?: number;
  longitude?: number;
  ianaTimeZone?: string;
  dataCenterLocation?: string;
  status?: ITwinStatus;
  parentId?: string;
  iTwinAccountId?: string;
  imageName?: string;
  image?: string;
  createdDateTime?: string;
  createdBy?: string;
  lastModifiedDateTime?: string;
  lastModifiedBy?: string;
}

/** An object that allow various configuration of the API access */
export interface ApiOverrides<T = never> {
  /** dev or qa */
  serverEnvironmentPrefix?: "dev" | "qa" | "";
  /** Data as props */
  data?: T;
}

type FilterOptions = string;

/** String/function that configures Project filtering behavior. */
export type ITwinFilterOptions = FilterOptions;

export enum DataStatus {
  Fetching = "fetching",
  Complete = "complete",
  FetchFailed = "error_fetchFailed",
  TokenRequired = "error_tokenRequired",
  ContextRequired = "error_contextRequired",
}

type SortOptions<T, K extends keyof T> = { sortType: K; descending: boolean };

/** Supported IModel sorting types */
export type IModelSortOptionsKeys = "name" | "createdDateTime";

/** Object/function that configure IModel sorting behavior. */
export type IModelSortOptions = SortOptions<IModelFull, IModelSortOptionsKeys>;

export type ITwinSubClass =
  | "Project"
  | "Asset"
  | "Portfolio"
  | "Program"
  | "WorkPackage"
  | "All";
export type ITwinClassType = "Thing" | "Endeavor";
export type ITwinStatus =
  | "Active"
  | "Inactive"
  | "Trial"
  | "active"
  | "inactive"
  | "trial";
export type ViewType = "tile" | "cells";
// Remove this IModelViewType with next major release i.e 2.0
export type IModelViewType = ViewType;

export type IModelCellOverrides = {
  name?: (cellData: CellProps<IModelFull>) => React.ReactNode;
  description?: (cellData: CellProps<IModelFull>) => React.ReactNode;
  createdDateTime?: (cellData: CellProps<IModelFull>) => React.ReactNode;
};

export type ITwinCellOverrides = {
  ITwinNumber?: (cellData: CellProps<ITwinFull>) => React.ReactNode;
  ITwinName?: (cellData: CellProps<ITwinFull>) => React.ReactNode;
  LastModified?: (cellData: CellProps<ITwinFull>) => React.ReactNode;
};
