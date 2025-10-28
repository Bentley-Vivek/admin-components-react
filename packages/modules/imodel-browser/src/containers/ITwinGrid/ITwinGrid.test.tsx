/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/
import "@testing-library/jest-dom";

import { render } from "@testing-library/react";
import React from "react";

import { DataStatus, ITwinCellOverrides } from "../../types";
import { ITwinGrid } from "./ITwinGrid";
import * as useITwinData from "./useITwinData";

describe("ITwinGrid", () => {
  beforeEach(() => {
    jest.spyOn(useITwinData, "useITwinData").mockReturnValue({
      iTwins: [
        {
          id: "iTwin1",
          number: "iTwinNumber1",
          displayName: "iTwinName1",
        },
        {
          id: "iTwin2",
          number: "iTwinNumber2",
          displayName: "iTwinName2",
        },
      ],
      status: DataStatus.Complete,
      fetchMore: undefined,
      refetchITwins: jest.fn(),
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should display the table and correct error message when no data is present", () => {
    // Arrange
    jest.spyOn(useITwinData, "useITwinData").mockReturnValue({
      iTwins: [],
      status: DataStatus.Complete,
      fetchMore: undefined,
      refetchITwins: jest.fn(),
    });

    // Act
    const wrapper = render(<ITwinGrid viewMode="cells" />);

    // Assert
    expect(
      wrapper.container.querySelector('div[class$="-table"]')
    ).toBeInTheDocument();
    expect(wrapper.getByText("No iTwin found.")).toBeDefined();
  });

  it("should display the table and correct rows", () => {
    // Act
    const wrapper = render(<ITwinGrid viewMode="cells" />);

    // Assert
    expect(
      wrapper.container.querySelector('div[class$="-table"]')
    ).toBeInTheDocument();
    expect(wrapper.getAllByRole("row").length).toEqual(3); // First row is header
  });

  it("should not refetch iTwins favorites when component rerenders", async () => {
    // Arrange
    jest.spyOn(useITwinData, "useITwinData").mockReturnValue({
      iTwins: [],
      status: DataStatus.Complete,
      fetchMore: jest.fn(),
      refetchITwins: jest.fn(),
    });
    // Act
    const signal = new AbortController().signal;
    const wrapper = render(
      <ITwinGrid
        accessToken="accessToken"
        apiOverrides={{ serverEnvironmentPrefix: "qa" }}
        viewMode="cells"
      />
    );
    wrapper.rerender(
      <ITwinGrid
        accessToken="accessToken"
        apiOverrides={{ serverEnvironmentPrefix: "qa" }}
        viewMode="tile"
      />
    );

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(fetch).toHaveBeenCalledWith(
      "https://qa-api.bentley.com/itwins/favorites?subClass=Project",
      {
        headers: {
          Accept: "application/vnd.bentley.itwin-platform.v1+json",
          "Cache-Control": "",
          authorization: "accessToken",
        },
        signal: signal,
      }
    );
  });
  it("should display the table and correct rows with custom cell overrides", () => {
    const cellOverrides: ITwinCellOverrides = {
      ITwinNumber: (props) => <strong>{props.value} 2</strong>,
      ITwinName: (props) => <em>{props.value} 3</em>,
    };

    const wrapper = render(
      <ITwinGrid viewMode="cells" cellOverrides={cellOverrides} />
    );

    expect(wrapper.getByText("iTwinNumber1 2")).toHaveStyle(
      "font-weight: bold"
    );
    expect(wrapper.getByText("iTwinName2 3")).toHaveStyle("font-style: italic");
  });
  it("should prevent onThumbnailClick from being called when button in cell is clicked with stopPropagation", () => {
    const onThumbnailClick = jest.fn();
    const onClick = jest.fn();
    const cellOverrides: ITwinCellOverrides = {
      ITwinNumber: (props) => (
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
      <ITwinGrid
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
    const onThumbnailClick = jest.fn();
    const onClick = jest.fn();
    const cellOverrides: ITwinCellOverrides = {
      ITwinNumber: (props) => (
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
      <ITwinGrid
        viewMode="cells"
        cellOverrides={cellOverrides}
        onThumbnailClick={onThumbnailClick}
      />
    );

    const buttons = getAllByText("Click Me");
    buttons[0].click();
    expect(onClick).toHaveBeenCalled();
    expect(onThumbnailClick).toHaveBeenCalled();
  });
});
