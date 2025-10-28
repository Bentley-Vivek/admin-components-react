/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/
import { MenuItem } from "@itwin/itwinui-react";
import React from "react";

type MenuItemProps = React.ComponentPropsWithoutRef<typeof MenuItem>;

export interface ContextMenuBuilderItem<T = any>
  extends Omit<MenuItemProps, "onClick" | "value"> {
  key: string;
  visible?: boolean | ((value: T) => boolean);
  onClick?: ((value?: T, refetchData?: () => void) => void) | undefined;
}

/** Build MenuItem array for the value for each provided options
 * @private
 */
export const _buildManagedContextMenuOptions: <T>(
  options: ContextMenuBuilderItem<T>[] | undefined,
  value: T,
  closeMenu?: () => void,
  refetchData?: () => void
) => JSX.Element[] | undefined = (options, value, closeMenu, refetchData) => {
  return options
    ?.filter?.(({ visible }) => {
      return typeof visible === "function" ? visible(value) : visible ?? true;
    })
    .map(({ key, visible, onClick, ...contextMenuProps }) => {
      return (
        <MenuItem
          {...contextMenuProps}
          onClick={(e?: React.MouseEvent) => {
            e?.stopPropagation();
            closeMenu?.();
            onClick?.(value, refetchData);
          }}
          key={key}
        />
      );
    });
};
