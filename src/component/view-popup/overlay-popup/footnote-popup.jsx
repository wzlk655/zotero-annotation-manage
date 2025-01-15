//@ts-nocheck nocheck
import React from "react";
import ViewPopup from "../common/view-popup";
import cx from "classnames";

function LinkPopup(props) {
  let iframeRef = React.useRef(null);
  let [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
  }, [props.params.content]);

  let handleLoad = () => {
    if (iframeRef.current) {
      let iframe = iframeRef.current;

      let contentStyleSheet = new iframe.contentWindow.CSSStyleSheet();
      contentStyleSheet.replaceSync(props.params.css);
      iframe.contentDocument.body.classList.add("footnote-popup-content");
      iframe.contentDocument.adoptedStyleSheets.push(contentStyleSheet);

      iframe.style.height = "0";
      iframe.style.height = iframe.contentWindow.document.documentElement.scrollHeight + "px";
      // eslint-disable-next-line no-undef
      let resizeObserver = new ResizeObserver(() => {
        if (!iframe.contentWindow) {
          resizeObserver.disconnect();
          return;
        }
        iframe.style.height = "0";
        iframe.style.height = iframe.contentWindow.document.documentElement.scrollHeight + "px";
      });
      resizeObserver.observe(iframe.contentDocument.body);
    }
    setLoading(false);
  };

  return (
    <ViewPopup
      className={cx("footnote-popup", { loading })}
      rect={props.params.rect}
      uniqueRef={loading ? {} : props.params.ref}
      padding={loading ? 0 : 10}
    >
      <iframe ref={iframeRef} sandbox="allow-same-origin" srcDoc={props.params.content} onLoad={handleLoad} />
    </ViewPopup>
  );
}

export default LinkPopup;
