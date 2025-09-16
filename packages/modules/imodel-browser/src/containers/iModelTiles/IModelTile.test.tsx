/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/
import "@testing-library/jest-dom";

import { render } from "@testing-library/react";
import React from "react";

import { IModelFull } from "../../types";
import { IModelTile } from "./IModelTile";

describe("IModelTile", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  const onThumbnailClick = jest.fn();
  const iModel: IModelFull = {
    id: "iModel1",
    displayName: "Test IModel",
    name: "TestIModel",
    description: "This is a test iModel",
    state: "initialized",
    createdDateTime: "2023-01-01T00:00:00Z",
    iTwinId: "iTwin1",
    thumbnail: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAUA",
  };
  it("should click the more options button without triggering the onThumbnailClick", () => {
    const { getByTestId } = render(
      <IModelTile
        iModel={iModel}
        onThumbnailClick={onThumbnailClick}
        iModelOptions={[
          {
            children: "Option 1",
            onClick: () => console.log("Option 1 clicked"),
            key: "Option 1",
          },
        ]}
      />
    );

    // check if you can click on the more options
    const moreOptions = getByTestId(`iModel-tile-${iModel.id}-more-options`);
    moreOptions.click();
    expect(onThumbnailClick).not.toHaveBeenCalled();
  });
  it("should trigger onThumbnailClick when name is clicked", () => {
    const { getByTestId } = render(
      <IModelTile
        iModel={iModel}
        onThumbnailClick={onThumbnailClick}
        tileProps={{
          name: <div>New iModel Name</div>,
        }}
      />
    );

    // check if you can click on the name
    const name = getByTestId(`iModel-tile-${iModel.id}-name-label`);
    name.click();
    expect(onThumbnailClick).toHaveBeenCalledWith(iModel);
  });
  it("should display metadata if provided", () => {
    const { getByTestId } = render(
      <IModelTile
        iModel={iModel}
        tileProps={{
          metadata: <div>New iModel Metadata</div>,
        }}
      />
    );

    // check if metadata is displayed
    const metadata = getByTestId(`iModel-tile-${iModel.id}-metadata`);
    expect(metadata).toBeInTheDocument();
  });
});
