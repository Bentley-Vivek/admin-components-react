/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/
import "./ITwinGrid.scss";

import { Table, ThemeProvider } from "@itwin/itwinui-react";
import React from "react";
import { InView } from "react-intersection-observer";

import { GridStructure } from "../../components/gridStructure/GridStructure";
import { NoResults } from "../../components/noResults/NoResults";
import {
  ApiOverrides,
  DataStatus,
  ITwinCellOverrides,
  ITwinFilterOptions,
  ITwinFull,
  ITwinSubClass,
  ViewType,
} from "../../types";
import { _mergeStrings } from "../../utils/_apiOverrides";
import { ContextMenuBuilderItem } from "../../utils/_buildMenuOptions";
import { IModelGhostTile } from "../iModelTiles/IModelGhostTile";
import { ITwinTile, ITwinTileProps } from "./ITwinTile";
import { useITwinData } from "./useITwinData";
import { useITwinFavorites } from "./useITwinFavorites";
import { useITwinTableConfig } from "./useITwinTableConfig";

export type IndividualITwinStateHook = (
  iTwin: ITwinFull,
  iTwinTileProps: ITwinTileProps & {
    gridProps: ITwinGridProps;
  }
) => Partial<ITwinTileProps>;

export interface ITwinGridStrings {
  /** Displayed for table favorites header. */
  tableColumnFavorites: string;
  /** Displayed for table name header. */
  tableColumnName: string;
  /** Displayed for table description header. */
  tableColumnDescription: string;
  /** Displayed for table lastModified header. */
  tableColumnLastModified: string;
  /** Displayed on table while loading data. */
  tableLoadingData: string;
  /** Badge text for trial iTwins */
  trialBadge: string;
  /** Badge text for inactive iTwins */
  inactiveBadge: string;
  /** Displayed after successful fetch, but no iTwins are returned. */
  noITwins: string;
  /** Displayed when the component is mounted but the accessToken is empty. */
  noAuthentication: string;
  /** Generic message displayed if an error occurs while fetching. */
  error: string;
  /** Accessible text for the hollow star icon to add the iTwin to favorites */
  addToFavorites: string;
  /** Accessible text for the full star icon to remove the iTwin from favorites */
  removeFromFavorites: string;
}

export interface ITwinGridProps {
  /** Access token that requires the `itwins:read` scope. Provide a function that returns the token to prevent the token from expiring. Function must be memoized. */
  accessToken?: string | (() => Promise<string>) | undefined;
  /** Type of iTwin to request */
  requestType?: "favorites" | "recents" | "";
  /** Sub class of iTwin, defaults to Project */
  iTwinSubClass?: ITwinSubClass;
  /** Thumbnail click handler. */
  onThumbnailClick?(iTwin: ITwinFull): void;
  /** String/function that configure iTwin filtering behavior.
   * A string will filter on displayed text only ().
   * A function allow filtering on anything, is used in a normal array.filter.
   */
  filterOptions?: ITwinFilterOptions;
  /**
   * Set the `$orderby` parameter when fetching iTwins from the iTwin API, e.g. `displayName ASC`.
   *
   * This only has an effect when the `requestType` is empty - it does not apply to "favorites" or "recents".
   *
   * See https://developer.bentley.com/apis/itwins/operations/get-my-itwins/#odata-queries for details.
   */
  orderbyOptions?: string;
  /** List of actions to build for each iTwin context menu. */
  iTwinActions?: ContextMenuBuilderItem<ITwinFull>[];
  /** Function (can be a react hook) that returns state for an iTwin, returned values will be applied as props to the iTwinTile, overrides ITwinGrid provided values */
  useIndividualState?: IndividualITwinStateHook;
  /** Static props to apply over each tile, mainly used for tileProps, overrides ITwinGrid provided values */
  tileOverrides?: Partial<ITwinTileProps>;
  /** Strings displayed by the browser */
  stringsOverrides?: Partial<ITwinGridStrings>;
  /** Object that configures different overrides for the API.
   * @property `data`: Array of iTwins used in the grid.
   * @property `serverEnvironmentPrefix`: Either qa or dev.
   */
  apiOverrides?: ApiOverrides<ITwinFull[]>;
  /**
   * Allow final transformation of the iTwin array before display
   * This function MUST be memoized.
   */
  postProcessCallback?: (
    iTwins: ITwinFull[],
    fetchStatus: DataStatus | undefined
  ) => ITwinFull[];
  /**iTwin view mode */
  viewMode?: ViewType;
  /** Overrides for cell rendering in cells viewMode */
  cellOverrides?: ITwinCellOverrides;
}

/**
 * Component that will allow displaying a grid of iTwins, given a requestType
 */
export const ITwinGrid = ({
  accessToken,
  apiOverrides,
  filterOptions,
  orderbyOptions,
  onThumbnailClick,
  iTwinActions,
  requestType,
  iTwinSubClass,
  stringsOverrides,
  tileOverrides,
  useIndividualState,
  postProcessCallback,
  viewMode,
  cellOverrides,
}: ITwinGridProps) => {
  const {
    iTwinFavorites,
    addITwinToFavorites,
    removeITwinFromFavorites,
    shouldRefetchFavorites,
    resetShouldRefetchFavorites,
  } = useITwinFavorites(accessToken, apiOverrides?.serverEnvironmentPrefix);

  const strings = _mergeStrings(
    {
      tableColumnFavorites: "",
      tableColumnName: "iTwin Number",
      tableColumnDescription: "iTwin Name",
      tableColumnLastModified: "Last Modified",
      tableLoadingData: "Loading...",
      trialBadge: "Trial",
      inactiveBadge: "Inactive",
      noITwins: "No iTwin found.",
      noAuthentication: "No access token provided",
      error: "An error occurred",
      addToFavorites: "Add to favorites",
      removeFromFavorites: "Remove from favorites",
    },
    stringsOverrides
  );
  const {
    iTwins: fetchedItwins,
    status: fetchStatus,
    fetchMore,
    refetchITwins,
  } = useITwinData({
    requestType,
    iTwinSubClass,
    accessToken,
    apiOverrides,
    filterOptions,
    orderbyOptions,
    shouldRefetchFavorites,
    resetShouldRefetchFavorites,
  });

  const iTwins = React.useMemo(
    () =>
      postProcessCallback?.([...fetchedItwins], fetchStatus) ?? fetchedItwins,
    [postProcessCallback, fetchedItwins, fetchStatus]
  );

  const { columns, onRowClick } = useITwinTableConfig({
    iTwinActions,
    onThumbnailClick,
    strings,
    iTwinFavorites,
    addITwinToFavorites,
    removeITwinFromFavorites,
    refetchITwins,
    cellOverrides,
  });

  const noResultsText = {
    [DataStatus.Fetching]: "",
    [DataStatus.Complete]: strings.noITwins,
    [DataStatus.FetchFailed]: strings.error,
    [DataStatus.TokenRequired]: strings.noAuthentication,
    [DataStatus.ContextRequired]: "",
  }[fetchStatus ?? DataStatus.Fetching];

  return viewMode !== "cells" ? (
    iTwins.length === 0 && noResultsText ? (
      <NoResults text={noResultsText} />
    ) : (
      <GridStructure>
        {fetchStatus === DataStatus.Fetching ? (
          <>
            <IModelGhostTile />
            <IModelGhostTile />
            <IModelGhostTile />
          </>
        ) : (
          <>
            {iTwins?.map((iTwin) => (
              <ITwinHookedTile
                gridProps={{
                  accessToken,
                  apiOverrides,
                  filterOptions,
                  onThumbnailClick,
                  requestType,
                  stringsOverrides,
                  tileOverrides,
                  useIndividualState,
                }}
                key={iTwin.id}
                iTwin={iTwin}
                iTwinOptions={iTwinActions}
                onThumbnailClick={onThumbnailClick}
                useTileState={useIndividualState}
                isFavorite={iTwinFavorites.has(iTwin.id)}
                addToFavorites={addITwinToFavorites}
                removeFromFavorites={removeITwinFromFavorites}
                refetchITwins={refetchITwins}
                {...tileOverrides}
              />
            ))}
            {fetchMore ? (
              <>
                <InView onChange={fetchMore}>
                  <IModelGhostTile />
                </InView>
                <IModelGhostTile />
                <IModelGhostTile />
              </>
            ) : null}
          </>
        )}
      </GridStructure>
    )
  ) : (
    <ThemeProvider theme="inherit">
      <Table<{ [P in keyof ITwinFull]: ITwinFull[P] }>
        columns={columns}
        data={iTwins}
        onRowClick={onRowClick}
        emptyTableContent={
          fetchStatus === DataStatus.Fetching
            ? strings.tableLoadingData
            : strings.noITwins
        }
        isLoading={fetchStatus === DataStatus.Fetching}
        onBottomReached={fetchMore}
        autoResetFilters={false}
        autoResetSortBy={false}
      />
    </ThemeProvider>
  );
};

type ITwinHookedTileProps = ITwinTileProps & {
  gridProps: ITwinGridProps;
  useTileState?: IndividualITwinStateHook;
};
const noOp = () => ({} as Partial<ITwinTileProps>);
const ITwinHookedTile = (props: ITwinHookedTileProps) => {
  const { useTileState = noOp, ...iTwinTileProps } = props;

  const hookIdentity = React.useRef(useTileState);

  if (hookIdentity.current !== useTileState) {
    throw new Error(
      "Even when used in a prop, useTilePropsForIModel identity must remain stable as it is used as a hook."
    );
  }

  const tileState = useTileState(props.iTwin, iTwinTileProps);
  return <ITwinTile {...iTwinTileProps} {...tileState} />;
};
