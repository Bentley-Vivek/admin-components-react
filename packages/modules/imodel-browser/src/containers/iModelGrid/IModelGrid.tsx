/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/
import { Table, ThemeProvider } from "@itwin/itwinui-react";
import React from "react";
import { InView } from "react-intersection-observer";

import { GridStructure } from "../../components/gridStructure/GridStructure";
import { NoResults } from "../../components/noResults/NoResults";
import {
  ApiOverrides,
  DataStatus,
  IModelCellOverrides,
  IModelFull,
  IModelSortOptions,
  ViewType,
} from "../../types";
import { _mergeStrings } from "../../utils/_apiOverrides";
import { ContextMenuBuilderItem } from "../../utils/_buildMenuOptions";
import { IModelGhostTile } from "../iModelTiles/IModelGhostTile";
import { IModelTile, IModelTileProps } from "../iModelTiles/IModelTile";
import styles from "./IModelGrid.module.scss";
import { DEFAULT_PAGE_SIZE, useIModelData } from "./useIModelData";
import { useIModelTableConfig } from "./useIModelTableConfig";

export interface IModelGridProps {
  /**
   * Access token that requires the `imodels:read` scope. Provide a function that returns the token to prevent the token from expiring. Function must be memoized. */
  accessToken?: string | (() => Promise<string>) | undefined;
  /** ITwin Id to list the iModels from (mutually exclusive to assetId) */
  iTwinId?: string | undefined;
  /** Thumbnail click handler. */
  onThumbnailClick?(iModel: IModelFull): void;
  /** Configure IModel sorting behavior.
   */
  sortOptions?: IModelSortOptions;
  /** List of actions to build for each imodel context menu. */
  iModelActions?: ContextMenuBuilderItem<IModelFull>[];
  /** Function (can be a react hook) that returns state for an iModel, returned values will be applied as props to the IModelTile, overrides IModelGrid provided values */
  useIndividualState?: (
    iModel: IModelFull,
    iModelTileProps: IModelTileProps
  ) => Partial<IModelTileProps>;
  /** Static props to apply over each tile, mainly used for tileProps, overrides IModelGrid provided values */
  tileOverrides?: Partial<IModelTileProps>;
  /** Strings displayed by the browser */
  stringsOverrides?: {
    /** Displayed for table name header. */
    tableColumnName?: string;
    /** Displayed for table description header. */
    tableColumnDescription?: string;
    /** Displayed for table lastModified header. */
    tableColumnLastModified?: string;
    /** Displayed on table while loading data. */
    tableLoadingData?: string;
    /** Displayed after successful fetch search, but no iModel is returned. */
    noIModelSearch?: string;
    /** Displayed after successful fetch search, but no iModel is returned, along with noIModelSearch text. */
    noIModelSearchSubtext?: string;
    /** Displayed after successful fetch, but no iModels are returned. */
    noIModels?: string;
    /** Displayed when the component is mounted and there is no iTwin or asset Id. */
    noContext?: string;
    /** Displayed when the component is mounted but the accessToken is empty. */
    noAuthentication?: string;
    /** Generic message displayed if an error occurs while fetching. */
    error?: string;
  };
  /** Object that configures different overrides for the API.
   * @property `data`: Array of iModels used in the grid.
   * @property `serverEnvironmentPrefix`: Either qa or dev.
   */
  apiOverrides?: ApiOverrides<IModelFull[]>;
  /**
   * Allow final transformation of the iModel array before display
   * This function MUST be memoized.
   */
  postProcessCallback?: (
    iModels: IModelFull[],
    fetchStatus: DataStatus | undefined,
    searchText: string | undefined
  ) => IModelFull[];
  /**Component to show when there is no iModel */
  emptyStateComponent?: React.ReactNode;
  /**  Exact name of the iModel to display */
  searchText?: string;
  /**iModel view mode */
  viewMode?: ViewType;
  /** The maximum number of iModels that can be fetched per request */
  pageSize?: number;
  /** Maximum number of iModels to fetch, default is unlimited */
  maxCount?: number;
  /** Overrides for cell rendering in cells viewMode */
  cellOverrides?: IModelCellOverrides;
  /** Additional class name for the grid structure */
  className?: string;
}

/**
 * Component that will allow displaying a grid of iModels, given a contextId
 */
export const IModelGrid = ({
  accessToken,
  apiOverrides,
  iModelActions,
  onThumbnailClick,
  iTwinId,
  sortOptions = { sortType: "name", descending: false },
  stringsOverrides,
  tileOverrides,
  useIndividualState,
  postProcessCallback,
  emptyStateComponent,
  searchText,
  viewMode,
  pageSize,
  maxCount,
  cellOverrides,
  className,
}: IModelGridProps) => {
  const [sort, setSort] = React.useState<IModelSortOptions>(sortOptions);
  const [isSortOnTable, setIsSortOnTable] = React.useState(false);

  React.useEffect(() => {
    if (!isSortOnTable) {
      const defaultTableSort: IModelSortOptions = {
        sortType: "name",
        descending: false,
      };
      setSort(
        viewMode === "cells"
          ? defaultTableSort
          : {
              sortType: sortOptions.sortType,
              descending: sortOptions.descending,
            }
      );
    }
  }, [isSortOnTable, sortOptions.descending, sortOptions.sortType, viewMode]);

  const strings = _mergeStrings(
    {
      tableColumnName: "Name",
      tableColumnDescription: "Description",
      tableColumnLastModified: "Last Modified",
      tableLoadingData: "Loading...",
      noIModelSearch: "No results found",
      noIModelSearchSubtext:
        "Try adjusting your search by using fewer or more general terms.",
      noIModels: "There are no iModels in this iTwin.",
      noContext: "No context provided",
      noAuthentication: "No access token provided",
      error: "An error occurred",
    },
    stringsOverrides
  );
  const {
    iModels: fetchediModels,
    status: fetchStatus,
    fetchMore,
    refetchIModels,
  } = useIModelData({
    accessToken,
    apiOverrides,
    iTwinId,
    sortOptions: sort,
    searchText,
    maxCount,
    pageSize,
    viewMode,
  });

  const iModels = React.useMemo(
    () =>
      postProcessCallback?.([...fetchediModels], fetchStatus, searchText) ??
      fetchediModels,
    [postProcessCallback, fetchediModels, fetchStatus, searchText]
  );

  React.useEffect(() => {
    if (
      iModels.length < (pageSize ?? DEFAULT_PAGE_SIZE) &&
      fetchMore &&
      fetchStatus !== DataStatus.Fetching
    ) {
      fetchMore();
    }
  }, [iModels.length, pageSize, fetchMore, fetchStatus]);

  const { columns, onRowClick } = useIModelTableConfig({
    iModelActions,
    onThumbnailClick,
    strings,
    refetchIModels,
    cellOverrides,
  });

  const noResultsText = {
    [DataStatus.Fetching]: "",
    [DataStatus.Complete]: strings.noIModels,
    [DataStatus.FetchFailed]: strings.error,
    [DataStatus.TokenRequired]: strings.noAuthentication,
    [DataStatus.ContextRequired]: strings.noContext,
  }[fetchStatus ?? DataStatus.Fetching];

  const tileApiOverrides = apiOverrides
    ? { serverEnvironmentPrefix: apiOverrides.serverEnvironmentPrefix }
    : undefined;

  const renderIModelGridStructure = () => {
    return (
      <>
        {viewMode !== "cells" ? (
          <GridStructure className={className}>
            {iModels?.map((iModel) => (
              <IModelHookedTile
                key={iModel.id}
                iModel={iModel}
                iModelOptions={iModelActions}
                accessToken={accessToken}
                onThumbnailClick={onThumbnailClick}
                apiOverrides={tileApiOverrides}
                useTileState={useIndividualState}
                refetchIModels={refetchIModels}
                {...tileOverrides}
              />
            ))}
            {fetchMore ? (
              <InView
                onChange={(inView) => {
                  inView && fetchStatus !== DataStatus.Fetching && fetchMore();
                }}
              >
                {({ ref }) => {
                  return (
                    <IModelGhostTile
                      ref={ref}
                      fullWidth={tileOverrides?.fullWidth}
                    />
                  );
                }}
              </InView>
            ) : null}
            {fetchStatus === DataStatus.Fetching && (
              <>
                <IModelGhostTile fullWidth={tileOverrides?.fullWidth} />
                <IModelGhostTile fullWidth={tileOverrides?.fullWidth} />
              </>
            )}
          </GridStructure>
        ) : (
          <ThemeProvider theme="inherit">
            <Table<{ [P in keyof IModelFull]: IModelFull[P] }>
              columns={columns}
              data={iModels}
              onRowClick={onRowClick}
              emptyTableContent={
                fetchStatus === DataStatus.Fetching
                  ? strings.tableLoadingData
                  : strings.noIModelSearch
              }
              isLoading={fetchStatus === DataStatus.Fetching}
              isSortable
              onSort={(state) => {
                const sortBy =
                  state.sortBy.length > 0 ? state.sortBy[0] : undefined;
                setIsSortOnTable(sortBy?.id !== undefined);
                if (
                  !sortBy ||
                  sortBy.desc === undefined ||
                  (sortBy.id !== "name" && sortBy.id !== "createdDateTime")
                ) {
                  return;
                }
                setSort({
                  sortType: sortBy.id,
                  descending: sortBy.desc,
                });
              }}
              manualSortBy
              onBottomReached={fetchMore}
              autoResetFilters={false}
              autoResetSortBy={false}
              bodyProps={{
                className: onThumbnailClick ? styles.rowCursor : "",
              }}
            />
          </ThemeProvider>
        )}
      </>
    );
  };

  const renderComponent = () => {
    if (
      !searchText &&
      iModels.length === 0 &&
      noResultsText === strings.noIModels &&
      emptyStateComponent
    ) {
      return <>{emptyStateComponent}</>;
    }
    if (!searchText && iModels.length === 0 && noResultsText) {
      return <NoResults text={noResultsText} />;
    }
    if (
      searchText &&
      iModels.length === 0 &&
      fetchStatus !== DataStatus.Fetching
    ) {
      return (
        <NoResults
          text={strings.noIModelSearch}
          subtext={strings.noIModelSearchSubtext}
          isSearchResult={true}
        />
      );
    }
    return renderIModelGridStructure();
  };
  return renderComponent();
};

type IModelHookedTileProps = IModelTileProps & {
  useTileState?: (
    iModel: IModelFull,
    iModelTileProps: IModelTileProps
  ) => Partial<IModelTileProps>;
};
const noOp = () => ({} as Partial<IModelTileProps>);
const IModelHookedTile = (props: IModelHookedTileProps) => {
  const { useTileState = noOp, ...iModelTileProps } = props;

  const hookIdentity = React.useRef(useTileState);

  if (hookIdentity.current !== useTileState) {
    throw new Error(
      "Even when used in a prop, useTilePropsForIModel identity must remain stable as it is used as a hook."
    );
  }

  const tileState = useTileState(props.iModel, iModelTileProps);
  return <IModelTile {...iModelTileProps} {...tileState} />;
};
