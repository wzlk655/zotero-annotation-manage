//@ts-nocheck nocheck

import React from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { ANNOTATION_COLORS } from "../../defines";
import ViewPopup from "./common/view-popup";
import CustomSections from "../common/custom-sections";

import { IconColor16 } from "../common/icons";

function SelectionPopup(props) {
  const intl = useIntl();

  function handleColorPick(color) {
    props.onAddAnnotation({ ...props.params.annotation, color });
  }

  function handleAddToNote() {
    props.onAddToNote([props.params.annotation]);
  }

  return (
    <ViewPopup className="selection-popup" rect={props.params.rect} uniqueRef={{}} padding={20}>
      <div className="colors" data-tabstop={true}>
        {ANNOTATION_COLORS.map((color, index) => (
          <button
            key={index}
            tabIndex={-1}
            className="toolbar-button color-button"
            title={intl.formatMessage({ id: color[0] })}
            onClick={() => handleColorPick(color[1])}
          >
            <IconColor16 color={color[1]} />
          </button>
        ))}
      </div>
      {props.enableAddToNote && (
        <button className="toolbar-button wide-button" data-tabstop={true} onClick={handleAddToNote}>
          <FormattedMessage id="pdfReader.addToNote" />
        </button>
      )}
      <CustomSections type="TextSelectionPopup" annotation={props.params.annotation} />
    </ViewPopup>
  );
}

export default SelectionPopup;
