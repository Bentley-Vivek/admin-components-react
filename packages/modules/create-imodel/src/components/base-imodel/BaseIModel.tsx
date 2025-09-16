/*---------------------------------------------------------------------------------------------
 * Copyright (c) Bentley Systems, Incorporated. All rights reserved.
 * See LICENSE.md in the project root for license terms and full copyright notice.
 *--------------------------------------------------------------------------------------------*/
import "./BaseIModel.scss";

import { LabeledInput, ProgressRadial, Text } from "@itwin/itwinui-react";
import React from "react";

import { BaseIModel, ExtentPoint, iModelExtent } from "../../types";
import { isPropertyInvalid, MAX_LENGTH } from "../../utils";
import { ButtonBar } from "../button-bar";
import {
  IModelContext,
  iModelProps,
  InnerIModelContext,
} from "../context/imodel-context";
import { IModelDescription } from "../imodel-description/IModelDescription";
import { IModelName } from "../imodel-name/IModelName";
import { UploadImage } from "../upload-image/UploadImage";

export type BaseIModelProps = {
  /** Callback on canceled action. */
  onClose?: () => void;
  /** Callback on action. */
  onActionClick?: (imodel: {
    name: string;
    description: string;
    thumbnail?: { src?: ArrayBuffer; type: string };
    extent?: iModelExtent | null;
  }) => void;
  /** Object of string overrides. */
  stringsOverrides?: {
    /** The title of the page. */
    titleString?: string;
    /** iModel name property. */
    nameString?: string;
    /** iModel description property. */
    descriptionString?: string;
    /** Confirm button string. */
    confirmButton?: string;
    /** Cancel button string. */
    cancelButton?: string;
    /** Error message when name is too long. */
    nameTooLong?: string;
    /** Error message when description is too long. */
    descriptionTooLong?: string;
    /** South West coordinate label. */
    southWestCoordinate?: string;
    /** North East coordinate label. */
    northEastCoordinate?: string;
    /** Latitude label. */
    latitude?: string;
    /** Longitude label. */
    longitude?: string;
  };
  /** If action is loading. */
  isLoading?: boolean;
  /** Initial iModel state used for update. */
  initialIModel?: BaseIModel;
  /** Extent component. Recommended to use a map component. If not provided then input fields for extent will be shown.
   * @example
   * <CreateIModel
   *   // ...
   *   extentComponent={
   *     <iframe
   *       title="iModel Extent Map"
   *       src="https://www.google.com/maps/embed"
   *       width="100%"
   *       height="100%"
   *       frameBorder="0"
   *       style={{ border: 0 }}
   *       allowFullScreen={false}
   *     ></iframe>
   *   }
   * />
   */
  extentComponent?: React.ReactNode;
  /** Extent value that should be gotten from the `extentComponent`. */
  extent?: iModelExtent | null;
  children?: React.ReactNode;
};

export function BaseIModelPage(props: BaseIModelProps) {
  const {
    onClose,
    onActionClick,
    initialIModel,
    isLoading = false,
    stringsOverrides,
    extentComponent,
    extent,
  } = props;

  const [imodel, setImodel] = React.useState<iModelProps>({
    name: initialIModel?.name ?? "",
    description: initialIModel?.description ?? "",
    thumbnail: { src: initialIModel?.thumbnail, type: "image/png" },
    extent: initialIModel?.extent,
  });
  const [isThumbnailChanged, setIsThumbnailChanged] =
    React.useState<boolean>(false);

  const updatedStrings = {
    titleString: "Create an iModel",
    nameString: "Name",
    descriptionString: "Description",
    confirmButton: "Create",
    cancelButton: "Cancel",
    nameTooLong: `The value exceeds allowed ${MAX_LENGTH} characters.`,
    descriptionTooLong: `The value exceeds allowed ${MAX_LENGTH} characters.`,
    southWestCoordinate: "South West coordinate",
    northEastCoordinate: "North East coordinate",
    latitude: "Latitude",
    longitude: "Longitude",
    ...stringsOverrides,
  };

  React.useEffect(() => {
    if (extent !== undefined) {
      setImodel((prevState) => ({
        ...prevState,
        extent: extent as iModelExtent,
      }));
    }
  }, [extent]);

  const onPropChange = (
    event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    event.persist();
    setImodel((prevState) => ({
      ...prevState,
      [event.target.name]: event.target.value ?? "",
    }));
  };

  const isDataValid = () => {
    return (
      !!imodel.name.trim().length &&
      !isPropertyInvalid(imodel.name, MAX_LENGTH) &&
      !isPropertyInvalid(imodel.description, MAX_LENGTH) &&
      (!imodel.extent ||
        (isPointValid(imodel.extent.northEast) &&
          isPointValid(imodel.extent.southWest)))
    );
  };

  const isDataChanged = () => {
    return (
      imodel.name !== initialIModel?.name ||
      imodel.description !== initialIModel?.description ||
      isThumbnailChanged ||
      isExtentChanged()
    );
  };

  const onImageChange = (src: ArrayBuffer, type: string) => {
    setIsThumbnailChanged(true);
    setImodel((prevState) => ({
      ...prevState,
      thumbnail: { src, type },
    }));
  };

  const onCoordinateChange = (
    point: keyof iModelExtent,
    coordinate: keyof ExtentPoint,
    value: string
  ) => {
    setImodel((prevState) => {
      const extent = {
        northEast: { ...prevState.extent?.northEast } ?? {},
        southWest: { ...prevState.extent?.southWest } ?? {},
      };
      extent[point][coordinate] = value === "" ? undefined : Number(value);
      return { ...prevState, extent: extent as iModelExtent };
    });
  };

  const isLatitudeValid = (latitude?: number) => {
    if (!latitude) {
      return true;
    }
    return -90 <= latitude && latitude <= 90;
  };

  const isLongitudeValid = (longitude?: number) => {
    if (!longitude) {
      return true;
    }
    return -180 <= longitude && longitude <= 180;
  };

  const isPointValid = (point: ExtentPoint) => {
    // If both fields empty then it is valid
    if (point.latitude == null && point.longitude == null) {
      return true;
    }
    // If one of the fields not empty then it is invalid
    if (point.latitude == null || point.longitude == null) {
      return false;
    }
    return isLatitudeValid(point.latitude) && isLongitudeValid(point.longitude);
  };

  const isExtentChanged = () => {
    return (
      imodel.extent?.northEast.latitude !==
        initialIModel?.extent?.northEast.latitude ||
      imodel.extent?.northEast.longitude !==
        initialIModel?.extent?.northEast.longitude ||
      imodel.extent?.southWest.latitude !==
        initialIModel?.extent?.southWest.latitude ||
      imodel.extent?.southWest.longitude !==
        initialIModel?.extent?.southWest.longitude
    );
  };

  const PointInput = (label: string, coordinate: keyof iModelExtent) => {
    return (
      <div className="iui-input-container">
        <div className="iui-label">{label}</div>
        <div className="iac-extent-inputs-container">
          <LabeledInput
            label={updatedStrings.latitude}
            value={imodel.extent?.[coordinate].latitude ?? ""}
            onChange={(e) =>
              onCoordinateChange(coordinate, "latitude", e.target.value)
            }
            displayStyle="inline"
            type="number"
            autoComplete="off"
            status={
              isLatitudeValid(imodel.extent?.[coordinate].latitude)
                ? undefined
                : "negative"
            }
            min={-90}
            max={90}
          />
          <LabeledInput
            label={updatedStrings.longitude}
            value={imodel.extent?.[coordinate]?.longitude ?? ""}
            onChange={(e) =>
              onCoordinateChange(coordinate, "longitude", e.target.value)
            }
            displayStyle="inline"
            type="number"
            autoComplete="off"
            status={
              isLongitudeValid(imodel.extent?.[coordinate].longitude)
                ? undefined
                : "negative"
            }
            min={-180}
            max={180}
          />
        </div>
      </div>
    );
  };

  return (
    <InnerIModelContext.Provider
      value={{
        nameString: updatedStrings?.nameString,
        nameTooLong: updatedStrings?.nameTooLong,
        descriptionString: updatedStrings?.descriptionString,
        descriptionTooLong: updatedStrings?.descriptionTooLong,
        confirmButtonText: updatedStrings.confirmButton,
        cancelButtonText: updatedStrings.cancelButton,
      }}
    >
      <IModelContext.Provider
        value={{
          imodel,
          onPropChange,
          onImageChange,
          confirmAction: () =>
            onActionClick?.({
              ...imodel,
              thumbnail: isThumbnailChanged ? imodel.thumbnail : undefined,
              extent: imodel.extent,
            }),
          cancelAction: onClose,
          isPrimaryButtonDisabled:
            !isDataChanged() || !isDataValid() || isLoading,
        }}
      >
        {props.children ?? (
          <div className="iac-imodel-base">
            <div className="iac-content-container">
              <Text variant="title">{updatedStrings.titleString}</Text>
              <div className="iac-imodel-properties-container">
                <div className="iac-inputs-container">
                  <IModelName />
                  <IModelDescription />
                  {!extentComponent && (
                    <>
                      {PointInput(
                        updatedStrings.southWestCoordinate,
                        "southWest"
                      )}
                      {PointInput(
                        updatedStrings.northEastCoordinate,
                        "northEast"
                      )}
                    </>
                  )}
                  <UploadImage />
                </div>
                {extentComponent && (
                  <div className="iac-extent-container">{extentComponent}</div>
                )}
              </div>
            </div>
            <ButtonBar />
            {isLoading && <OverlaySpinner />}
          </div>
        )}
      </IModelContext.Provider>
    </InnerIModelContext.Provider>
  );
}

function OverlaySpinner() {
  return (
    <div className="iac-overlay-container">
      <ProgressRadial indeterminate />
    </div>
  );
}
