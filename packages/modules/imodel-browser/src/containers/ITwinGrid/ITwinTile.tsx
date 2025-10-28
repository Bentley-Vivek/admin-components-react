/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/
import { SvgItwin, SvgStar, SvgStarHollow } from "@itwin/itwinui-icons-react";
import { Badge, IconButton, ThemeProvider, Tile } from "@itwin/itwinui-react";
import React from "react";

import { ITwinFull } from "../../types";
import { _mergeStrings } from "../../utils/_apiOverrides";
import {
  _buildManagedContextMenuOptions,
  ContextMenuBuilderItem,
} from "../../utils/_buildMenuOptions";

export type TileProps = React.ComponentPropsWithoutRef<typeof Tile>;

export interface ITwinTileProps {
  /** iTwin to display */
  iTwin: ITwinFull;
  /** List of options to build for the iTwin context menu */
  iTwinOptions?: ContextMenuBuilderItem<ITwinFull>[];
  /** Function to call on thumbnail click */
  onThumbnailClick?(iTwin: ITwinFull): void;
  /** Strings displayed by the browser */
  stringsOverrides?: {
    /** Badge text for trial iTwins */
    trialBadge?: string;
    /** Badge text for inactive iTwins */
    inactiveBadge?: string;
    /** Accessible text for the hollow star icon to add the iTwin to favorites */
    addToFavorites?: string;
    /** Accessible text for the full star icon to remove the iTwin from favorites */
    removeFromFavorites?: string;
  };
  /** Tile props that will be applied after normal use. (Will override ITwinTile if used) */
  tileProps?: Partial<TileProps>;
  /**  Indicates whether the iTwin is marked as a favorite */
  isFavorite?: boolean;
  /**  Function to add the iTwin to favorites  */
  addToFavorites?(iTwinId: string): Promise<void>;
  /**  Function to remove the iTwin from favorites  */
  removeFromFavorites?(iTwinId: string): Promise<void>;
  /** Function to refetch iTwins */
  refetchITwins?: () => void;
  /** Indicates whether the tile should take the full width of its container */
  fullWidth?: boolean;
}

/**
 * Representation of an iTwin
 */
export const ITwinTile = ({
  iTwin,
  iTwinOptions,
  onThumbnailClick,
  tileProps,
  stringsOverrides,
  isFavorite,
  addToFavorites,
  removeFromFavorites,
  refetchITwins,
  fullWidth,
}: ITwinTileProps) => {
  const {
    name,
    description,
    status,
    isNew,
    isLoading,
    isSelected,
    thumbnail,
    badge,
    leftIcon,
    rightIcon,
    buttons,
    metadata,
    moreOptions,
    children,
    isDisabled,
    onClick,
    ...rest
  } = tileProps ?? {};

  const strings = _mergeStrings(
    {
      trialBadge: "Trial",
      inactiveBadge: "Inactive",
      addToFavorites: "Add to favorites",
      removeFromFavorites: "Remove from favorites",
    },
    stringsOverrides
  );

  const moreOptionsBuilt = React.useMemo(
    () =>
      _buildManagedContextMenuOptions(
        iTwinOptions,
        iTwin,
        undefined,
        refetchITwins
      ),
    [iTwinOptions, iTwin, refetchITwins]
  );
  return (
    <ThemeProvider theme="inherit">
      <Tile.Wrapper
        key={iTwin.id}
        isNew={isNew}
        isSelected={isSelected}
        isLoading={isLoading}
        status={status}
        isDisabled={isDisabled}
        style={fullWidth ? { width: "100%" } : undefined}
        {...rest}
      >
        <Tile.Name>
          {(status || isNew || isLoading || isSelected) && <Tile.NameIcon />}
          <Tile.NameLabel>
            <Tile.Action
              onClick={(e) => onClick?.(e) ?? onThumbnailClick?.(iTwin)}
              aria-disabled={isDisabled}
              data-testid={`iTwin-tile-${iTwin.id}`}
            >
              {name ?? iTwin.displayName}
            </Tile.Action>
          </Tile.NameLabel>
        </Tile.Name>
        <Tile.ThumbnailArea>
          {leftIcon && <Tile.TypeIndicator>{leftIcon}</Tile.TypeIndicator>}
          <Tile.QuickAction>
            {rightIcon}
            <IconButton
              aria-label={
                isFavorite
                  ? strings.removeFromFavorites
                  : strings.addToFavorites
              }
              onClick={async () => {
                isFavorite
                  ? await removeFromFavorites?.(iTwin.id)
                  : await addToFavorites?.(iTwin.id);
              }}
              styleType="borderless"
            >
              {isFavorite ? <SvgStar /> : <SvgStarHollow />}
            </IconButton>
          </Tile.QuickAction>
          <Tile.BadgeContainer>
            {badge ??
              (iTwin.status &&
                iTwin.status.toLocaleLowerCase() !== "active" && (
                  <Badge
                    backgroundColor={
                      iTwin.status.toLocaleLowerCase() === "inactive"
                        ? "oak"
                        : "steelblue"
                    }
                  >
                    {iTwin.status.toLocaleLowerCase() === "inactive"
                      ? strings.inactiveBadge
                      : strings.trialBadge}
                  </Badge>
                ))}
          </Tile.BadgeContainer>
          <Tile.ThumbnailPicture
            style={{ cursor: onThumbnailClick ? "pointer" : "auto" }}
          >
            {thumbnail ?? <SvgItwin />}
          </Tile.ThumbnailPicture>
        </Tile.ThumbnailArea>
        <Tile.ContentArea>
          <Tile.Description>
            {description ?? iTwin.number ?? ""}
          </Tile.Description>
          {metadata && (
            <Tile.Metadata data-testid={`iTwin-tile-${iTwin.id}-metadata`}>
              {metadata}
            </Tile.Metadata>
          )}
          {children}
          {(moreOptions || moreOptionsBuilt) && (
            <Tile.MoreOptions
              data-testid={`iTwin-tile-${iTwin.id}-more-options`}
            >
              {moreOptions ?? moreOptionsBuilt}
            </Tile.MoreOptions>
          )}
        </Tile.ContentArea>
        {buttons && <Tile.Buttons>{buttons}</Tile.Buttons>}
      </Tile.Wrapper>
    </ThemeProvider>
  );
};
