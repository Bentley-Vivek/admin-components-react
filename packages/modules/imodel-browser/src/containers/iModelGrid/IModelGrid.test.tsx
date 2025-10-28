/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/
import "@testing-library/jest-dom";

import { render, waitFor } from "@testing-library/react";
import React from "react";

import { DataStatus, IModelCellOverrides, IModelFull, IModelGrid } from "../..";
import * as useIModelData from "./useIModelData";

describe("IModelGrid", () => {
  beforeEach(() => {
    jest.spyOn(useIModelData, "useIModelData").mockReturnValue({
      iModels: [
        {
          id: "iModel1",
          name: "Test IModel",
          displayName: "Test IModel",
          description: "This is a test iModel",
        },
        {
          id: "iModel2",
          name: "Test IModel 2",
          displayName: "Test IModel 2",
          description: "This is another test iModel",
        },
      ],
      status: DataStatus.Complete,
      fetchMore: undefined,
      refetchIModels: jest.fn(),
    });
  });
  it("renders without crashing", () => {
    const wrapper = render(<IModelGrid viewMode="cells" />);
    expect(wrapper).toBeDefined();
  });
  it("should display normal name and description", () => {
    const { getByText } = render(<IModelGrid viewMode="cells" />);
    expect(getByText("Test IModel")).toBeDefined();
    expect(getByText("This is a test iModel")).toBeDefined();
  });
  it("should apply custom cell overrides", () => {
    const cellOverrides: IModelCellOverrides = {
      name: (props) => <strong>{props.value} 2</strong>,
      description: (props) => <em>{props.value} 3</em>,
    };
    const { getByText } = render(
      <IModelGrid viewMode="cells" cellOverrides={cellOverrides} />
    );
    expect(getByText("Test IModel 2")).toHaveStyle("font-weight: bold");
    expect(getByText("This is a test iModel 3")).toHaveStyle(
      "font-style: italic"
    );
  });
  it("should handle empty data correctly", () => {
    jest.spyOn(useIModelData, "useIModelData").mockReturnValue({
      iModels: [],
      status: DataStatus.Complete,
      fetchMore: undefined,
      refetchIModels: jest.fn(),
    });

    const wrapper = render(<IModelGrid viewMode="cells" />);
    expect(
      wrapper.getByText("There are no iModels in this iTwin.")
    ).toBeDefined();
  });
  it("should display overwritten empty message", () => {
    jest.spyOn(useIModelData, "useIModelData").mockReturnValue({
      iModels: [],
      status: DataStatus.Complete,
      fetchMore: undefined,
      refetchIModels: jest.fn(),
    });

    const { getByText } = render(
      <IModelGrid
        viewMode="cells"
        stringsOverrides={{
          noIModels: "No iModels available",
        }}
      />
    );
    expect(getByText("No iModels available")).toBeDefined();
  });
  it("should display the table and correct rows", () => {
    const wrapper = render(<IModelGrid viewMode="cells" />);
    expect(
      wrapper.container.querySelector('div[class$="-table"]')
    ).toBeInTheDocument();
    expect(wrapper.getAllByRole("row").length).toEqual(3); // Header row + 2 data rows
  });
  it("should prevent onThumbnailClick from being called when button in cell is clicked with stopPropagation", () => {
    const onClick = jest.fn();
    const onThumbnailClick = jest.fn();
    const cellOverrides: IModelCellOverrides = {
      name: (props) => (
        <div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onClick();
            }}
          >
            Click Me
          </button>
          {props.value}
        </div>
      ),
    };

    const { getAllByText } = render(
      <IModelGrid
        viewMode="cells"
        cellOverrides={cellOverrides}
        onThumbnailClick={onThumbnailClick}
      />
    );

    const buttons = getAllByText("Click Me");
    buttons[0].click();
    expect(onClick).toHaveBeenCalled();
    expect(onThumbnailClick).not.toHaveBeenCalled();
  });
  it("should call onThumbnailClick when button doesn't have stopPropagation", () => {
    const onClick = jest.fn();
    const onThumbnailClick = jest.fn();
    const cellOverrides: IModelCellOverrides = {
      name: (props) => (
        <div>
          <button
            onClick={() => {
              onClick();
            }}
          >
            Click Me
          </button>
          {props.value}
        </div>
      ),
    };

    const { getAllByText } = render(
      <IModelGrid
        viewMode="cells"
        cellOverrides={cellOverrides}
        onThumbnailClick={onThumbnailClick}
      />
    );

    const buttons = getAllByText("Click Me");
    buttons[0].click();
    expect(onClick).toHaveBeenCalled();
    expect(onThumbnailClick).toHaveBeenCalledWith({
      id: "iModel1",
      name: "Test IModel",
      displayName: "Test IModel",
      description: "This is a test iModel",
    });
  });
  it("should have more options when iModelActions are provided in cells view", () => {
    const iModelActions = [
      {
        key: "action1",
        label: "Action 1",
        onClick: jest.fn(),
      },
      {
        key: "action2",
        label: "Action 2",
        onClick: jest.fn(),
      },
    ];

    const { getByTestId, queryAllByRole } = render(
      <IModelGrid viewMode="cells" iModelActions={iModelActions} />
    );

    const optionsButton = getByTestId("iModel-row-iModel1-more-options");
    expect(optionsButton).toBeDefined();
    let menuItems = queryAllByRole("menuitem");
    expect(menuItems.length).toBe(0);
    optionsButton.click();
    // the dropdown should open and show the actions label Action 1 and Action 2
    menuItems = queryAllByRole("menuitem");
    expect(menuItems.length).toBe(2); // Action 1 and Action 2
  });

  const generateMockIModels = (count: number, prefix = ""): IModelFull[] => {
    return Array.from({ length: count }).map((_, index) => ({
      id: `${prefix}${index}`,
      displayName: `${prefix}${index}`,
      name: `${prefix}${index}`,
      description: `${prefix}-description`,
    }));
  };

  it("should show all data with postProcessCallback filtering", async () => {
    const pageSize = 3;
    const firstPageIModels = generateMockIModels(3, "iModel");
    firstPageIModels[1].description = "unmatched";
    firstPageIModels[2].description = "unmatched";

    const secondPageIModels = generateMockIModels(3, "iModel");
    secondPageIModels[1].description = "unmatched";
    secondPageIModels[2].description = "unmatched";

    const thirdPageIModels = generateMockIModels(3, "iModel");

    const mockFetchMore = jest.fn();

    const useIModelDataMock = jest.spyOn(useIModelData, "useIModelData");

    useIModelDataMock.mockReturnValue({
      iModels: firstPageIModels,
      status: DataStatus.Complete,
      fetchMore: mockFetchMore,
      refetchIModels: jest.fn(),
    });

    const postProcessCallback = jest
      .fn()
      .mockImplementation((iModels: IModelFull[]) => {
        return iModels.filter(
          (iModel) => iModel.description === "iModel-description"
        );
      });

    const { rerender } = render(
      <IModelGrid
        viewMode="cells"
        pageSize={pageSize}
        postProcessCallback={postProcessCallback}
      />
    );

    await waitFor(() => {
      expect(mockFetchMore).toHaveBeenCalled();
    });

    useIModelDataMock.mockReturnValue({
      iModels: [...firstPageIModels, ...secondPageIModels],
      status: DataStatus.Complete,
      fetchMore: mockFetchMore,
      refetchIModels: jest.fn(),
    });

    mockFetchMore.mockClear();
    postProcessCallback.mockImplementation((iModels: IModelFull[]) => {
      return iModels.filter(
        (iModel) => iModel.description === "iModel-description"
      );
    });

    rerender(
      <IModelGrid
        viewMode="cells"
        pageSize={pageSize}
        postProcessCallback={postProcessCallback}
      />
    );

    expect(postProcessCallback).toHaveBeenCalledWith(
      [...firstPageIModels, ...secondPageIModels],
      DataStatus.Complete,
      undefined
    );

    await waitFor(() => {
      expect(mockFetchMore).toHaveBeenCalled();
    });

    useIModelDataMock.mockReturnValue({
      iModels: [...firstPageIModels, ...secondPageIModels, ...thirdPageIModels],
      status: DataStatus.Complete,
      fetchMore: mockFetchMore,
      refetchIModels: jest.fn(),
    });

    mockFetchMore.mockClear();

    postProcessCallback.mockImplementation((iModels: IModelFull[]) => {
      return iModels.filter(
        (iModel) => iModel.description === "iModel-description"
      );
    });

    rerender(
      <IModelGrid
        viewMode="cells"
        pageSize={pageSize}
        postProcessCallback={postProcessCallback}
      />
    );

    expect(postProcessCallback).toHaveBeenCalledWith(
      [...firstPageIModels, ...secondPageIModels, ...thirdPageIModels],
      DataStatus.Complete,
      undefined
    );

    expect(mockFetchMore).not.toHaveBeenCalled();
  });
});
