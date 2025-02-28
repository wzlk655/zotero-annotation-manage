import { getPref, getPrefAs, setPref } from "../utils/prefs";
import {
  sortAsc,
  sortFixed,
  sortFixedTags100Modified10Asc,
  sortFixedTags10ValuesLength,
  sortValuesLength,
  sortFixedTags1000Ann100Modified10Asc,
  sortByFixedTag2TagName,
  sortFixedTags10Asc,
  sortFixedTags10AscByKey,
} from "../utils/sort";
import { groupByResult, mapDateModified } from "../utils/groupBy";
import {
  groupByResultIncludeFixedTags,
  isDebug,
  memoizeAsyncGroupAllTagsDB,
  memFixedColor,
  memFixedTags,
  memRelateTags,
  str2RegExps,
  getItem,
} from "../utils/zzlb";
import { groupBy } from "../utils/groupBy";
import * as React from "react";
import { useEffect, useRef, useState } from "react";
import { getString } from "../utils/locale";
import { useImmer } from "use-immer";
// import { ArrowContainer, Popover, PopoverPosition, PopoverState, usePopover } from "react-tiny-popover";
// import { ChangeColor } from "./ChangeColor";
import { saveAnnotationTags } from "../modules/AnnotationPopup";

import {
  Config,
  ConfigTab,
  ConfigTabArray,
  ConfigTypeArray,
  ScaleActionType,
  ScaleActionTypeArray,
  ScaleItemActionType,
  ScaleItemActionTypeArray,
  SortType,
  SortTypeArray,
  WindowType,
  WindowTypeArray,
  loadDefaultConfig,
} from "./Config";
import "./tagStyle.css";
import styles from "./tagStyle.css";
// import { Popover } from '@radix-ui/react-popover';
import FixedPopup from './FixedPopup';
// import { Popover, PopoverPosition, PopoverState } from 'react-tiny-popover';
// import Sketch from '@uiw/react-color-sketch';
// import { ColorPicker, useColor } from 'react-color-palette';
// console.log(styles.tagButton)

export function PopupRoot({
  reader,
  params,
  doc,
  root,
  maxWidth,
}: {
  reader: _ZoteroTypes.ReaderInstance;
  params: {
    annotation?: _ZoteroTypes.Annotations.AnnotationJson;
    ids?: any;
    currentID?: string;
    x?: number;
    y?: number;
  };
  doc: Document;
  root: HTMLDivElement;
  maxWidth: number;
}) {
  //定义全局变量
  // ztoolkit.log("css测试", styles.tagButton);
  const item = reader._item;
  // item.isCollection
  const _annotationManager = reader._annotationManager;
  const _keyboardManager = reader._keyboardManager;
  const annotations = item.getAnnotations();

  //定义状态
  // ztoolkit.log("params", params);
  const [isShowConfig, setShowConfig] = useState(getPrefAs("showConfig", false));
  const [bComment, setBComment] = useState(getPrefAs("bComment", false));
  const [comment, setComment] = useState("");
  const [configTab, setConfigTab] = useState<ConfigTab>(getPrefAs("configTab", "PanelConfig"));
  //取代固定窗口和单独窗口
  // const [windowType, setWindowType] = useState<WindowType>(getPrefAs("windowType", "FollowParent"));
  const [windowType, setWindowType] = useState<WindowType>("FollowParent");

  // const [pSingleWindow, setPSingleWindow] = useState(getPrefAs("pSingleWindow", false));
  // const [pFixedContentLocation, setPFixedContentLocation] = useState(getPrefAs("pFixedContentLocation", false));
  const [isShowSelectedPopupColorsTag, setShowSelectedPopupColorsTag] = useState(getPrefAs("show-selected-popup-colors-tag", false));
  const [isShowSelectedPopupMatchTag, setShowSelectedPopupMatchTag] = useState(getPrefAs("show-selected-popup-match-tag", false));
  const [colorsFlexDirection, setColorsFlexDirection] = useState(getPrefAs("colors-flex-direction", "column"));
  const [matchFlexDirection, setMatchFlexDirection] = useState(getPrefAs("match-flex-direction", "column"));
  const [divMaxWidth, setDivMaxWidth] = useState(getPrefAs("divMaxWidth", 600));
  const [divMaxHeight, setDivMaxHeight] = useState(getPrefAs("divMaxHeight", 600));
  const [fontSize, setFontSize] = useState(getPrefAs("fontSize", 17));
  const [lineHeight, setLineHeight] = useState(getPrefAs("lineHeight", "1.45"));
  const [btnMarginTB, setbtnMarginTB] = useState(getPrefAs("btnMarginTB", 0));
  const [sortType, setSortType] = useState<SortType>(getPrefAs("sortType", "RecentUse"));
  const [btnMarginLR, setbtnMarginLR] = useState(getPrefAs("btnMarginLR", 0));
  const [btnPaddingTB, setbtnPaddingTB] = useState(getPrefAs("btnPaddingTB", 0));
  const [btnPaddingLR, setbtnPaddingLR] = useState(getPrefAs("btnPaddingLR", 0));
  const [buttonBorderRadius, setButtonBorderRadius] = useState(getPrefAs("buttonBorderRadius", 5));
  const [relateItemShowAll, setRelateItemShowAll] = useState(getPrefAs("relateItemShowAll", false));
  const [isCtrlAdd, setIsCtrlAdd] = useState(getPrefAs("isCtrlAdd", false));
  const [rItemShowRelateTags, setrItemShowRelateTags] = useState(getPrefAs("rItemShowRelateTags", false));
  // const [relateItemSort, setRelateItemSort] = useState(getPrefAs("relateItemSort", "2"));
  const [existAnnotations, updateExistAnnotations] = useImmer([] as Zotero.Item[]);
  const [existTags, updateExistTags] = useImmer([] as string[]);
  const [delTags, updateDelTags] = useImmer([] as string[]);

  const [displayTags, updateDisplayTags] = useImmer([] as { key: string; values: { tag: string }[]; color?: string }[]);
  const [selectedTags, updateSelectedTags] = useState([] as { tag: string; color: string }[]);
  const [searchTag, setSearchTag] = useState("");
  const [currentPosition, setCurrentPosition] = useState(Zotero.getActiveZoteroPane().getSelectedCollection()?.name || "我的文库");
  const [searchResultLength, setSearchResultLength] = useState(0);
  const [showTagsLength, setShowTagsLength] = useState(getPrefAs("showTagsLength", 20));

  const [relateTags, setRelateTags] = useState(
    [] as {
      key: string;
      values: { tag: string; type: number; dateModified: string }[];
    }[],
  );
  // ztoolkit.log("ids", params.ids)
  const [autoCloseSeconds, setAutoCloseSeconds] = useState(params.ids ? getPrefAs("autoCloseSeconds", 15) : -1); //只在倒计时时间

  const [isPopoverOpen, setIsPopoverOpen] = useState(true);
  const [bgColor, setBgColor] = useState(getPrefAs("bgColor", "#fff"));
  // const [color, setColor] = useColor("rgb(86 30 203)");
  const [blockHightLightUnderLineToggle, setBlockHightLightUnderLineToggle] = useState(getPrefAs("blockHUToggle", false)); //屏蔽 Zotero 高亮/下划线切换按钮
  const [pPadding, setPPadding] = useState(getPrefAs("pPadding", 0));
  const [pBoundaryInset, setPBoundaryInset] = useState(getPrefAs("pBoundaryInset", 40));
  const [pArrowSize, setPArrowSize] = useState(getPrefAs("pArrowSize", 0));
  const [pPositions, updatePPositions] = useImmer(getPrefAs("pPositions", "bottom,left,top,right").split(","));
  const [bAutoFocus, setBAutoFocus] = useState(getPrefAs("bAutoFocus", false));
  const [pFCLLeft, setFCLLeft] = useState(getPrefAs("pFCLLeft", 0));
  const [nFCLTop, setFCLTop] = useState(getPrefAs("nFCLTop", 0));
  const [selectionPopupSize, setSelectionPopupSize] = useState({ width: 0, height: 0 });
  const [configName, setConfigName] = useState(getPref("configName"));
  const [exAction, setExAction] = useState(getPref("exAction") as string);
  const [sScale, setSScale] = useState(getPref("sScale"));
  const [sScaleAction, setSScaleAction] = useState<ScaleActionType | ScaleItemActionType | undefined>(
    getPref("sScaleAction") as ScaleActionType,
  );
  const [sScaleItem, setSScaleItem] = useState("");
  useEffect(() => {
    if (sScale) {
      if (item.getAnnotations().findIndex((f) => f.hasTag("量表") && f.annotationText == sScale) == -1) {
        setSScale("");
        setPref("sScale", "");
        setSScaleItem("");
        setPref("sScaleItem", "");
      } else {
        if (
          item
            .getAnnotations()
            .findIndex((f) => f.hasTag("量表item") && f.annotationText == sScaleItem && f.annotationComment.includes(`*${sScale}*`)) == -1
        ) {
          setSScaleItem("");
          setPref("sScaleItem", "");
        }
      }
    } else {
      setSScaleItem("");
      setPref("sScaleItem", "");
    }
  }, []);

  const tagStyle = {
    marginLeft: btnMarginLR + "px",
    marginRight: btnMarginLR + "px",
    marginTop: btnMarginTB + "px",
    marginBottom: btnMarginTB + "px",
    paddingLeft: btnPaddingLR + "px",
    paddingRight: btnPaddingLR + "px",
    paddingTop: btnPaddingTB + "px",
    paddingBottom: btnPaddingTB + "px",
    borderRadius: buttonBorderRadius + "px",
    border: "2px outset ButtonBorder",
    fontSize: fontSize + "px",
    lineHeight: lineHeight,
    cursor: "default",
    ":hover": {
      marginTop: "20px",
    },
  };
  const configItemStyle = { display: "inline-block", margin: "0 5px" };
  const tabDiv = Zotero.getMainWindow().Zotero_Tabs.deck.querySelector("#" + Zotero.getMainWindow().Zotero_Tabs.selectedID) as HTMLDivElement;
  const readerUiDiv = (tabDiv.querySelector("browser") as HTMLIFrameElement).contentDocument?.querySelector("#reader-ui") as HTMLDivElement;
  const primaryViewDiv = (tabDiv.querySelector(".reader") as HTMLIFrameElement)?.contentDocument?.querySelector(
    "#split-view #primary-view",
  ) as HTMLDivElement;
  const parentElement = tabDiv;
  const boundaryElement = tabDiv;
  const lastScaleKey = getPref("lastScaleKey") as string;
  const [lastScale, setLastScale] = useState<Zotero.Item | undefined>(getItem(lastScaleKey));
  const lastScaleItemKey = getPref("lastScaleItemKey") as string;
  const [lastScaleItem, setLastScaleItem] = useState<Zotero.Item | undefined>(getItem(lastScaleItemKey));

  if (isDebug()) boundaryElement.style.border = "1px solid red";
  // setWindowType("FollowParent") //!Fix 目前改为只跟随窗口  

  useEffect(() => {
    //加载当前item的标签
    async function loadData() {
      if (params.ids) {
        const _existAnnotations = item.getAnnotations().filter((f) => params.ids.includes(f.key));
        updateExistAnnotations((_a) => _existAnnotations);
        const _existTags = _existAnnotations.flatMap((f) => f.getTags()).map((a) => a.tag);
        updateExistTags((_a) => _existTags);
      }

      let relateTags: groupByResult<
        {
          tag: string;
          type: number;
          dateModified: string;
        },
        string
      >[] = [];
      // root.style.width=this.getSelectTextWidth()+"px"
      if (relateItemShowAll) {
        relateTags = await memoizeAsyncGroupAllTagsDB();
      } else {
        relateTags = groupBy(memRelateTags(item), (t10) => t10.tag);
      }
      // const d = groupByEqual(memRelateTags(item), (t10) => t10, (a, b) => a.tag == b.tag);
      // const e=groupByEqual((await memAllTagsDB()), a => a.key)
      const tagsExclude = (getPref("tags-exclude") as string) || "";
      if (tagsExclude) {
        const rs = str2RegExps(tagsExclude);
        if (rs.length > 0) relateTags = relateTags.filter((f) => !rs.some((s) => s.test(f.key)));
      }

      // if (rItemShowRelateTags)
      groupByResultIncludeFixedTags(relateTags);
      if (sortType == "RecentUse") {
        //2 固定标签 + 最近使用时间
        relateTags = relateTags.map(mapDateModified).sort(sortFixedTags100Modified10Asc);
      } else if (sortType == "CharAsc") {
        relateTags = relateTags.sort(sortFixedTags10AscByKey);
      } else if (sortType == "UseCountDesc") {
        relateTags = relateTags.sort(sortFixedTags10ValuesLength);
      } else if (sortType == "ItemAndRecent") {
        //3 固定标签 + 本条目 + 修改时间
        const itemAnnTags = item
          ?.getAnnotations()
          .flatMap((f) => f.getTags())
          .map((a) => a.tag)
          .filter((t) => !memFixedTags().includes(t))
          .sort(sortAsc);
        relateTags = relateTags.map(mapDateModified).sort(sortFixedTags1000Ann100Modified10Asc(itemAnnTags));
      }
      setRelateTags(relateTags);
    }
    loadData();
  }, [relateItemShowAll, rItemShowRelateTags, sortType]);
  useEffect(() => {
    //输入查询的控制
    async function search() {
      let searchResult = relateTags;
      if (searchTag) {
        const searchIn = await memoizeAsyncGroupAllTagsDB();
        if (searchTag.match(/^\s*$/g)) {
          searchResult = searchIn;
          setCurrentPosition("我的文库");
        } else {
          searchResult = searchIn.filter((f) => new RegExp(searchTag, "i").test(f.key));

          setCurrentPosition("搜索中");
        }
      } else {
        setCurrentPosition(Zotero.getActiveZoteroPane().getSelectedCollection()?.name || "我的文库");
      }
      setSearchResultLength(searchResult.length);
      updateDisplayTags(searchResult.slice(0, showTagsLength).map((a) => Object.assign({}, a, { color: memFixedColor(a.key, "") })));
      // setIsPopoverOpen(true)
      // forceRerender()
      //要出发弹出窗口重绘是不是有更简单的办法

      //触发 useLayoutEffect()
      ztoolkit.log(
        "getBoundingClientRect2",
        refPopover.current?.getBoundingClientRect(),
        refContentDiv.current?.getBoundingClientRect(),
        boundaryElement.getBoundingClientRect(),
      );
    }
    search();
  }, [searchTag, relateTags, showTagsLength, sortType]);
  const timeRef = useRef<NodeJS.Timeout>(); //设置延时器
  //倒计时
  useEffect(() => {
    //如果设置倒计时且倒计时不为0
    if (autoCloseSeconds > 0) {
      timeRef.current = setTimeout(() => {
        setAutoCloseSeconds((time) => time - 1);
      }, 1000);
    }
    if (autoCloseSeconds == 0) {
      root.remove();
      setIsPopoverOpen(false);
    }
    return () => {
      if (timeRef.current) clearTimeout(timeRef.current);
    };
  }, [autoCloseSeconds]);
  useEffect(() => {
    const q = (
      (tabDiv.querySelector("browser") as HTMLIFrameElement)?.contentDocument?.querySelector("#primary-view iframe") as HTMLIFrameElement
    )?.contentDocument?.querySelector("#viewerContainer") as HTMLDivElement;
    function qs(e: any) {
      // ztoolkit.log("scroll", e)
      // setPPading2()
    }
    if (q) {
      q.addEventListener("scroll", qs);
    }

    ztoolkit.log("scroll ???", q);
    return () => {
      q?.removeEventListener("scroll", qs);
    };
  }, []);

  // const c = ztoolkit.UI.appendElement({ tag: "div" }, root) as HTMLDivElement
  //如果没有触发关闭的话，需要通过监控selection-popup的removed事件
  useEffect(() => {
    if (params.ids) return;
    const MutationObserver = ztoolkit.getGlobal("MutationObserver");
    const observer = new MutationObserver((mutations: any) => {
      for (const mutation of mutations) {
        for (const rn of mutation.removedNodes) {
          if ((rn as HTMLDivElement)?.classList?.contains("selection-popup")) {
            setIsPopoverOpen(false);
          }
        }
      }
    });
    observer.observe(readerUiDiv, { childList: true, subtree: true });
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    if (params.ids) return;
    const selectionPopup = (tabDiv.querySelector("browser") as HTMLIFrameElement).contentDocument?.querySelector(
      "#reader-ui .selection-popup",
    ) as HTMLDivElement;
    if (!selectionPopup) return;
    const ResizeObserver = ztoolkit.getGlobal("ResizeObserver");
    const resizeObserver = new ResizeObserver((_entries: any) => {
      const size = {
        width: selectionPopup.clientWidth,
        height: selectionPopup.clientHeight,
      };
      setSelectionPopupSize(size);
      ztoolkit.log("监听宽度的变化", selectionPopupSize, size);
    });
    if (selectionPopup) {
      resizeObserver.observe(selectionPopup);
    }
    setSelectionPopupSize({
      width: selectionPopup.clientWidth,
      height: selectionPopup.clientHeight,
    });
    return () => {
      resizeObserver.disconnect();
    };
  }, []);
  //加载默认值
  // useEffect(() => {
  //   setPBoundaryInset(getPrefAs("pBoundaryInset", 40));
  // }, []);
  useEffect(() => {
    const c = refContentDiv.current;
    if (!c) return;
    // c.style.maxWidth = "unset"
    // c.style.width = "600px";
    function updatePopupSize(): void {
      if (!c) return;
      const viewer = tabDiv;
      const rootHeight = c.scrollHeight;
      const rootWidth = c.scrollWidth;
      if (rootHeight / rootWidth > 2) {
        //
      } else if (rootHeight / rootWidth < 0.5) {
        //
      } else {
        //
      }
      // const newWidth = rootWidth + 20;
      // Check until H/W<0.75 and don't overflow viewer border
      // if (
      //   // textHeight / rootWidth > 0.75 &&
      //   // selectionMenu.offsetLeft + newWidth < viewer.offsetWidth
      // ) {
      //   // Update width
      //   // textarea.style.width = `${newWidth}px`;
      //   // updatePopupSize(selectionMenu, textarea, false);
      //   return;
      // }
      // root.style.height = `${rootHeight + 3}px`;
    }

    updatePopupSize();
  }, [selectionPopupSize]);
  useEffect(() => {
    // setPBoundaryInset((pBoundaryInset) => pBoundaryInset);
    ztoolkit.log(
      "getBoundingClientRect",
      refPopover.current?.getBoundingClientRect(),
      refContentDiv.current?.getBoundingClientRect(),
      boundaryElement.getBoundingClientRect(),
    );
  }, [displayTags]);

  useEffect(() => {
    const toolToggle = readerUiDiv?.querySelector(".selection-popup .tool-toggle") as HTMLElement | undefined;
    if (toolToggle) {
      toolToggle.style.display = blockHightLightUnderLineToggle ? "none" : "";
      // ztoolkit.log("toolToggle", "blockHightLightUnderLineToggle", blockHightLightUnderLineToggle, toolToggle.style.display)
    }
  }, [blockHightLightUnderLineToggle]);
  const refContentDiv = useRef<HTMLDivElement>(null);
  const refPopover = useRef<HTMLDivElement>(null);
  const refPopoverDiv = useRef<HTMLDivElement>(null);
  const refInputTag = useRef<HTMLInputElement>(null);

  const clickMeButtonRef = React.useRef<HTMLElement | null>(null);

  const vars = [
    lastScale,
    lastScaleItem,
    exAction,
    sScale,
    sScaleAction,
    sScaleItem,
    bComment,
    comment,
    blockHightLightUnderLineToggle,
    autoCloseSeconds,
    existTags,
    delTags,
    windowType,
    isCtrlAdd,
    selectedTags,
    bgColor,
    bAutoFocus,
    configName,
    // pSingleWindow,
    isPopoverOpen,
    pPositions,
    pPadding,
    // pFixedContentLocation,
    displayTags,
    isShowConfig,
    configTab,
    pFCLLeft,
    nFCLTop,
    divMaxWidth,
    pBoundaryInset,
    pArrowSize,
    showTagsLength,
    fontSize,
    lineHeight,
    btnMarginTB,
    btnMarginLR,
    btnPaddingTB,
    btnPaddingLR,
    sortType,
    divMaxHeight,
    buttonBorderRadius,
  ];
  const handleConfigDiv = React.useCallback(
    () => (
      <>
        {isShowConfig && (
          <div
            style={{
              margin: "5px",
              fontSize: "18px",
              lineHeight: "1.5",
              background: "#ddd",
              width: "600px",
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              {ConfigTabArray.map((a) => (
                <span
                  key={a}
                  style={{
                    margin: "0px",
                    padding: "0 5px",
                    borderRadius: "8px 8px 3px 3px",
                    borderBottom: "1px solid black",
                    borderLeft: a !== configTab ? "1px solid black" : "",
                    borderRight: a !== configTab ? "1px solid black" : "",
                    borderTop: a == configTab ? "1px solid black" : "",
                    background: a == configTab ? "#faa" : "",
                  }}
                  onClick={() => {
                    setPref("configTab", a);
                    setConfigTab(a);
                  }}
                >
                  {getString("popupRoot-" + a)}
                </span>
              ))}
            </div>

            {"PanelConfig" == configTab && (
              <>
                <span style={configItemStyle}>
                  {ConfigTypeArray.map((a) => loadDefaultConfig(a)).map(
                    (config) =>
                      config && (
                        <button
                          key={config.configName}
                          className="btn"
                          style={{
                            ...tagStyle,
                            background: config.bgColor,
                            fontWeight: configName == config.configName ? "bold" : "",
                            border: configName == config.configName ? "1px solid #000" : "",
                          }}
                          onClick={() => {
                            selectConfig(config);
                          }}
                          defaultValue={config.configName}
                        >
                          {getString("popupRoot-ConfigType-" + config.configName)}
                        </button>
                      ),
                  )}
                </span>
                <span style={configItemStyle}>
                  {/* <ChangeColor
                    color={bgColor}
                    onChange={(e) => {
                      setBgColor(e);
                      setPref("bgColor", e);
                    }}
                  >
                    <span
                      style={{
                        background: bgColor,
                        minWidth: fontSize + "px",
                        minHeight: fontSize + "px",
                        border: "1px solid #000",
                        display: "inline-block",
                      }}
                    ></span>
                    <span>调整背景颜色 </span>
                  </ChangeColor> */}
                </span>
                {/* <label style={configItemStyle}>
                  <input
                    type="checkbox"
                    defaultChecked={pSingleWindow}
                    onChange={(e) => {
                      setPSingleWindow(e.currentTarget.checked);
                      setPref("pSingleWindow", e.currentTarget.checked);
                    }}
                  />
                  使用独立弹出弹窗 {!pSingleWindow && "（建议宽度小于300）"}
                  {pSingleWindow}
                </label> */}

                {/* <div>
                  排序规则：
                  {SortTypeArray.map((a) => (
                    <label>
                      <input type="radio" value={a} checked={sortType === a} onChange={handleInput("sortType", setSortType)} />
                      {a}
                    </label>
                  ))}
                </div> */}
                <span style={configItemStyle}>
                  <input
                    style={inputWidth("zlb")}
                    type="number"
                    min={5}
                    max={100}
                    defaultValue={getPrefAs("autoCloseSeconds", 15)}
                    onInput={(e) => {
                      if (e.currentTarget.value) {
                        setAutoCloseSeconds(e.currentTarget.valueAsNumber);
                        setPref("autoCloseSeconds", e.currentTarget.valueAsNumber);
                      }
                    }}
                  />
                  秒后自动关闭。
                </span>
                <label style={configItemStyle}>
                  <input
                    type="checkbox"
                    defaultChecked={bAutoFocus}
                    onChange={(e) => {
                      setBAutoFocus(e.currentTarget.checked);
                      setPref("bAutoFocus", e.currentTarget.checked);
                    }}
                  />
                  输入框自动获得焦点
                </label>
                {/* <span>当前配置：{configName}</span> */}

                <label>
                  <input
                    type="checkbox"
                    defaultChecked={blockHightLightUnderLineToggle}
                    onChange={handleInputBoolean("blockHUToggle", setBlockHightLightUnderLineToggle)}
                  />
                  屏蔽 Zotero 高亮/下划线切换按钮
                </label>

                <label>
                  <input type="checkbox" defaultChecked={bComment} onChange={handleInputBoolean("bComment", setBComment)} />
                  允许输入注释
                </label>

                <div>
                  窗口显示样式： {getString("popupRoot-WindowType-FollowParent")}
                  {/* {WindowTypeArray.map((a) => (
                    <label key={a}>

                      <input type="radio" value={a} checked={windowType === a} onChange={handleInput("windowType", setWindowType)} />
                      {getString("popupRoot-WindowType-" + a)}
                    </label>
                  ))} */}
                </div>

                <span style={configItemStyle}>
                  最大高度:
                  <input
                    type="number"
                    min={30}
                    max={600}
                    step={10}
                    defaultValue={divMaxHeight}
                    style={inputWidth("zlb")}
                    onInput={(e) => {
                      if (e.currentTarget.value) {
                        setPref("divMaxHeight", e.currentTarget.valueAsNumber);
                        setDivMaxHeight(e.currentTarget.valueAsNumber);
                      }
                    }}
                  />
                  px。
                </span>

                <span style={configItemStyle}>
                  最大宽度:
                  <input
                    type="number"
                    min={100}
                    max={1200}
                    step={10}
                    defaultValue={divMaxWidth}
                    style={inputWidth("zlb")}
                    onInput={(e) => {
                      if (e.currentTarget.value) {
                        setPref("divMaxWidth", e.currentTarget.valueAsNumber);
                        setDivMaxWidth(e.currentTarget.valueAsNumber);
                      }
                    }}
                  />
                  px。
                </span>
              </>
            )}
            {"FixedPanel" == configTab && (
              <div>
                {/* <label>
                  <input
                    type="checkbox"
                    defaultChecked={pFixedContentLocation}
                    onChange={(e) => {
                      setPFixedContentLocation(e.currentTarget.checked);
                      setPref("pFixedContentLocation", e.currentTarget.checked);
                    }}
                  />
                  固定弹出区域
                </label> */}

                <span style={configItemStyle}>
                  left:
                  <input
                    type="number"
                    min={0}
                    step={10}
                    max={500}
                    style={inputWidth("zlb")}
                    defaultValue={pFCLLeft}
                    onInput={(e) => {
                      if (e.currentTarget.value) {
                        setPref("pFCLLeft", e.currentTarget.value);
                        setFCLLeft(e.currentTarget.valueAsNumber);
                      }
                    }}
                  />
                </span>
                <span style={configItemStyle}>
                  top:
                  <input
                    type="number"
                    min={0}
                    step={10}
                    max={1000}
                    style={inputWidth("zzlb")}
                    defaultValue={nFCLTop}
                    onInput={handleInputNumber("nFCLTop", setFCLTop)}
                  />
                </span>
              </div>
            )}
            {"PopupPanel" == configTab && (
              <div
                style={{
                  fontSize: "18px",
                  lineHeight: "1.5",
                }}
              >
                <>
                  {/* <label style={configItemStyle}>
                    <input
                      type="checkbox"
                      defaultChecked={!pFixedContentLocation}
                      onChange={(e) => {
                        setPFixedContentLocation(!e.currentTarget.checked);
                        setPref("pFixedContentLocation", !e.currentTarget.checked);
                      }}
                    />
                    浮动弹出区域。
                  </label> */}
                  <span style={configItemStyle}>
                    和颜色框的距离:
                    <input
                      type="number"
                      min={0}
                      step={1}
                      max={200}
                      style={inputWidth("zlb")}
                      defaultValue={Math.round(pPadding)}
                      onInput={(e) => {
                        if (e.currentTarget.value) {
                          setPref("pPadding", e.currentTarget.value);
                          setPPadding(e.currentTarget.valueAsNumber);
                        }
                      }}
                    />
                  </span>
                  <span style={configItemStyle}>
                    边缘检测距离:
                    <input
                      type="number"
                      min={40}
                      step={1}
                      max={200}
                      style={inputWidth("zlb")}
                      defaultValue={pBoundaryInset}
                      onInput={(e) => {
                        if (e.currentTarget.value) {
                          setPref("pBoundaryInset", e.currentTarget.value);
                          setPBoundaryInset(e.currentTarget.valueAsNumber);
                        }
                      }}
                    />
                  </span>
                  {/*已取消 <span style={configItemStyle}>
                    三角大小:
                    <input
                      type="number"
                      min={0}
                      step={1}
                      max={200}
                      style={inputWidth("zlb")}
                      defaultValue={pArrowSize}
                      onInput={(e) => {
                        if (e.currentTarget.value) {
                          setPref("pArrowSize", e.currentTarget.value);
                          setPArrowSize(e.currentTarget.valueAsNumber);
                        }
                      }}
                    />
                  </span> */}
                  {/* <span style={configItemStyle}>
                    优先默认位置:
                    {("bottom,left,top,right".split(",") as PopoverPosition[]).sort(sortFixed(pPositions)).map((a, i) => (
                      <span key={a} style={configItemStyle}>
                        [
                        {i > 0 && i < pPositions.length && (
                          <span
                            onClick={() => {
                              updatePPositions((pPositions) => {
                                pPositions.splice(i - 1, 0, ...pPositions.splice(i, 1));
                                setPref("pPositions", pPositions.join(","));
                              });
                            }}
                          >
                            ⬅️
                          </span>
                        )}
                        <label style={{ margin: "0 2px" }}>
                          <input
                            type="checkbox"
                            defaultChecked={pPositions.includes(a)}
                            onChange={(_e) => {
                              updatePPositions((pPositions) => {
                                const index = pPositions.findIndex((f) => f == a);
                                if (index > -1) pPositions.splice(i, 1);
                                else pPositions.push(a);
                                setPref("pPositions", pPositions.join(","));
                              });
                            }}
                          />
                          {a}
                        </label>
                        {i < pPositions.length - 1 && (
                          <span
                            onClick={() => {
                              updatePPositions((pPositions) => {
                                pPositions.splice(i + 1, 0, ...pPositions.splice(i, 1));
                                setPref("pPositions", pPositions.join(","));
                              });
                            }}
                          >
                            ➡️
                          </span>
                        )}
                        ]
                      </span>
                    ))}
                  </span> */}
                </>
              </div>
            )}

            {"ColorsPanel" == configTab && (
              <span>
                <label style={configItemStyle}>
                  <input
                    type="checkbox"
                    defaultChecked={isShowSelectedPopupColorsTag}
                    onInput={(e) => {
                      setPref("show-selected-popup-colors-tag", e.currentTarget.checked);
                      setShowSelectedPopupColorsTag(e.currentTarget.checked);
                    }}
                  />
                  {getString("pref-show-selected-popup-colors-tag", {
                    branch: "label",
                  })}
                </label>
                <label style={configItemStyle}>
                  <input
                    type="radio"
                    name="colorsFlexDirection"
                    defaultChecked={colorsFlexDirection == "column"}
                    value="column"
                    onInput={(e) => {
                      setPref("colors-flex-direction", e.currentTarget.value);
                      setColorsFlexDirection(e.currentTarget.value);
                    }}
                  />
                  column
                </label>
                <label style={configItemStyle}>
                  <input
                    type="radio"
                    name="colorsFlexDirection"
                    defaultChecked={colorsFlexDirection == "row"}
                    value="row"
                    onInput={(e) => {
                      setPref("colors-flex-direction", e.currentTarget.value);
                      setColorsFlexDirection(e.currentTarget.value);
                    }}
                  />
                  row
                </label>
                <label style={configItemStyle}>
                  <input
                    type="checkbox"
                    defaultChecked={isShowSelectedPopupMatchTag}
                    onInput={(e) => {
                      setPref("show-selected-popup-match-tag", e.currentTarget.checked);
                      setShowSelectedPopupMatchTag(e.currentTarget.checked);
                    }}
                  />
                  {getString("pref-show-selected-popup-match-tag", {
                    branch: "label",
                  })}
                </label>

                <label style={configItemStyle}>
                  <input
                    type="radio"
                    name="matchFlexDirection"
                    defaultChecked={matchFlexDirection == "column"}
                    value="column"
                    onInput={(e) => {
                      setPref("match-flex-direction", e.currentTarget.value);
                      setMatchFlexDirection(e.currentTarget.value);
                    }}
                  />
                  column
                </label>
                <label style={configItemStyle}>
                  <input
                    type="radio"
                    name="matchFlexDirection"
                    defaultChecked={matchFlexDirection == "row"}
                    value="row"
                    onInput={(e) => {
                      setPref("match-flex-direction", e.currentTarget.value);
                      setMatchFlexDirection(e.currentTarget.value);
                    }}
                  />
                  row
                </label>

                <br />
              </span>
            )}
            {"TagsStyle" == configTab && (
              <>
                <span style={configItemStyle}>
                  显示
                  <input
                    type="number"
                    defaultValue={showTagsLength}
                    min={0}
                    max={100}
                    style={inputWidth("lb")}
                    onInput={(e) => {
                      setPref("showTagsLength", e.currentTarget.value);
                      setShowTagsLength(e.currentTarget.valueAsNumber);
                    }}
                  />
                  个。
                </span>
                <span style={configItemStyle}>
                  字体大小:
                  <input
                    type="number"
                    min={6}
                    max={72}
                    step={0.5}
                    defaultValue={fontSize}
                    style={inputWidth("lb")}
                    onInput={(e) => {
                      if (e.currentTarget.value) {
                        setPref("fontSize", e.currentTarget.valueAsNumber);
                        setFontSize(e.currentTarget.valueAsNumber);
                      }
                    }}
                  />
                  px。
                </span>
                <span style={configItemStyle}>
                  行高:
                  <input
                    type="number"
                    defaultValue={lineHeight}
                    min={0.1}
                    max={3}
                    step={0.1}
                    style={inputWidth("lb")}
                    onInput={(e) => {
                      setPref("lineHeight", e.currentTarget.value);
                      setLineHeight(e.currentTarget.value);
                    }}
                  />{" "}
                </span>
                <span style={configItemStyle}>
                  margin:
                  <input
                    type="number"
                    min={-10}
                    max={200}
                    step={0.5}
                    defaultValue={btnMarginTB}
                    style={inputWidth("lb")}
                    onInput={(e) => {
                      if (e.currentTarget.value) {
                        setPref("btnMarginTB", e.currentTarget.valueAsNumber);
                        setbtnMarginTB(e.currentTarget.valueAsNumber);
                      }
                    }}
                  />
                  <input
                    type="number"
                    min={-10}
                    max={200}
                    step={0.5}
                    defaultValue={btnMarginLR}
                    style={inputWidth("lb")}
                    onInput={(e) => {
                      if (e.currentTarget.value) {
                        setPref("btnMarginLR", e.currentTarget.valueAsNumber);
                        setbtnMarginLR(e.currentTarget.valueAsNumber);
                      }
                    }}
                  />
                </span>
                <span style={configItemStyle}>
                  padding:
                  <input
                    type="number"
                    min={-10}
                    max={200}
                    step={0.5}
                    defaultValue={btnPaddingTB}
                    style={inputWidth("lb")}
                    onInput={(e) => {
                      if (e.currentTarget.value) {
                        setPref("btnPaddingTB", e.currentTarget.valueAsNumber);
                        setbtnPaddingTB(e.currentTarget.valueAsNumber);
                      }
                    }}
                  />
                  <input
                    type="number"
                    min={-10}
                    max={200}
                    step={0.5}
                    defaultValue={btnPaddingLR}
                    style={inputWidth("lb")}
                    onInput={(e) => {
                      if (e.currentTarget.value) {
                        setPref("btnPaddingLR", e.currentTarget.valueAsNumber);
                        setbtnPaddingLR(e.currentTarget.valueAsNumber);
                      }
                    }}
                  />{" "}
                </span>
                <span style={configItemStyle}>
                  圆角:
                  <input
                    type="number"
                    min={0}
                    max={30}
                    step={0.5}
                    defaultValue={buttonBorderRadius}
                    style={inputWidth("lb")}
                    onInput={handleInputNumber("buttonBorderRadius", setButtonBorderRadius)}
                  />
                </span>
              </>
            )}
            {"TagsSetting" == configTab && (
              <>
                <div>
                  排序规则：
                  {SortTypeArray.map((a) => (
                    <label key={a}>
                      <input type="radio" value={a} checked={sortType === a} onChange={handleInput("sortType", setSortType)} />
                      {getString("popupRoot-SortType-" + a)}
                    </label>
                  ))}
                </div>
                <label style={configItemStyle}>
                  按住Ctrl同时添加多个Tag
                  <input
                    type="checkbox"
                    defaultChecked={isCtrlAdd}
                    onInput={(e) => {
                      setPref("isCtrlAdd", e.currentTarget.checked);
                      setIsCtrlAdd(e.currentTarget.checked);
                    }}
                  />
                </label>
              </>
            )}
            {"Development" == configTab && (
              <>
                <div>
                  相关标签的范围：（未完成）
                  <label>
                    <input type="checkbox" value="0" defaultChecked={getPrefAs("TagRangeSelfItem", false)} />
                    本条目
                  </label>
                  <label>
                    <input type="checkbox" value="0" defaultChecked={getPrefAs("TagRangeSelfCollection", false)} />
                    本条目所在文件夹[]
                  </label>
                  <label>
                    <input type="checkbox" value="0" defaultChecked={getPrefAs("TagRangeSelfCollection", false)} />
                    本条目所在文件夹以及子文件夹[]
                  </label>
                  <label>
                    <input type="checkbox" value="0" defaultChecked={getPrefAs("TagRangeSelfCollection", false)} />
                    我的文库所有文件
                  </label>
                </div>
                <div>Nest标签相关：（未完成）</div>
                <div>Tag排除规则：（未完成）</div>
              </>
            )}
          </div>
        )}
      </>
    ),
    vars,
  );
  const handleContentDiv = React.useCallback(
    () => (
      <div
        ref={refContentDiv}
        style={{
          maxWidth: (windowType == "FollowParent" && !params.ids ? selectionPopupSize.width - 16 : divMaxWidth) + "px",
          maxHeight: divMaxHeight + "px",
          //@ts-ignore overflowY
          overflowY: "overlay",
          // background: "#f00",
        }}
      >
        {!params.ids && lastScale && lastScale.parentKey == item.key && (
          <>
            <div
              style={{
                maxWidth: (windowType == "FollowParent" && !params.ids ? selectionPopupSize.width - 16 : divMaxWidth) + "px",
                display: "flex",
                flexWrap: "wrap",
              }}
            >
              {" "}
              <button
                className="toolbar-button"
                style={{ width: "unset", margin: " 0 2px", height: "auto" }}
                onClick={() => {
                  setLastScale(undefined);
                  setPref("lastScaleKey", "");
                  setLastScaleItem(undefined);
                  setPref("lastScaleItemKey", "");
                }}
              >
                ❌
              </button>{" "}
              <span>量表: {lastScale.annotationText.substring(0, 30)}</span>
            </div>{" "}
            <div
              style={{
                maxWidth: (windowType == "FollowParent" && !params.ids ? selectionPopupSize.width - 16 : divMaxWidth) + "px",
                display: "flex",
                flexWrap: "wrap",
              }}
            >
              {ScaleActionTypeArray.map((a) => (
                <button key={a}
                  className="toolbar-button"
                  style={{ width: "unset", margin: " 0 2px", height: "auto" }}
                  onClick={() => {
                    setIsPopoverOpen(false);
                    saveAnnotationTags(
                      "量表" + a,
                      selectedTags,
                      delTags,
                      reader,
                      params,
                      doc,
                      undefined,
                      `*${lastScale.annotationText}*` + comment,
                    );
                  }}
                >
                  {a}
                </button>
              ))}
            </div>
            {lastScaleItem && lastScaleItem.parentKey == item.key && (
              <>
                <div
                  style={{
                    maxWidth: (windowType == "FollowParent" && !params.ids ? selectionPopupSize.width - 16 : divMaxWidth) + "px",
                    display: "flex",
                    flexWrap: "wrap",
                  }}
                >
                  {" "}
                  <button
                    className="toolbar-button"
                    style={{ width: "unset", margin: " 0 2px", height: "auto" }}
                    onClick={() => {
                      setLastScaleItem(undefined);
                      setPref("lastScaleItemKey", "");
                    }}
                  >
                    ❌
                  </button>{" "}
                  <span>item:{lastScaleItem.annotationText.substring(0, 30)}</span>
                </div>
                <div
                  style={{
                    maxWidth: (windowType == "FollowParent" && !params.ids ? selectionPopupSize.width - 16 : divMaxWidth) + "px",
                    display: "flex",
                    flexWrap: "wrap",
                  }}
                >
                  {ScaleItemActionTypeArray.map((a) => (
                    <button key={a}
                      className="toolbar-button"
                      style={{ width: "unset", margin: " 0 2px", height: "auto" }}
                      onClick={() => {
                        setIsPopoverOpen(false);
                        saveAnnotationTags(
                          "量表" + a,
                          selectedTags,
                          delTags,
                          reader,
                          params,
                          doc,
                          undefined,
                          `*${lastScaleItem.annotationText}*` + comment,
                        );
                      }}
                    >
                      {a}
                    </button>
                  ))}{" "}
                </div>
              </>
            )}
          </>
        )}
        {!params.ids && !lastScale && lastScale && (
          <>
            <div style={{ display: "flex", flexWrap: "wrap" }}>
              {["量表", "元"]
                .filter((f) => annotations.some((s) => s.hasTag(f)))
                .map((action) => (
                  <button key={action}
                    className="toolbar-button"
                    style={{ width: "unset", margin: "2px" }}
                    onClick={() => {
                      if (exAction == action) {
                        setExAction("");
                        setPref("exAction", "");
                      } else {
                        setExAction(action);
                        setPref("exAction", action);
                      }
                    }}
                  >
                    {exAction == action ? `【${action}操作】` : action}
                  </button>
                ))}
            </div>

            {exAction == "量表" && (
              <>
                {/* <div style={{ display: "flex", flexWrap: "wrap" }}>
              {sScaleAction ? (
                <button className='toolbar-button' style={{ width: "unset" }} onClick={() => {
                  setSScaleAction("")
                }}>类型：{sScaleAction}</button>
              ) : (["item", "CR", "CA", "AVE", "factorLoading", "reference", "description"].map(a => (<button className='toolbar-button' style={{ width: "unset", margin: "2px" }} onClick={() => {
                setSScaleAction(a)
                setPref("sScaleAction", a)
              }}>{a}</button>)))}
            </div> */}
                <div>
                  {sScaleAction &&
                    (sScale ? (
                      <button
                        className="toolbar-button"
                        style={{ width: "unset" }}
                        onClick={() => {
                          setSScale("");
                        }}
                      >
                        量表：{sScale}
                      </button>
                    ) : (
                      item
                        .getAnnotations()
                        .filter((f) => f.hasTag("量表"))
                        .map((a) => (
                          <button key={a.key}
                            className="toolbar-button"
                            style={{ width: "unset" }}
                            onClick={() => {
                              setSScale(a.annotationText);
                              setPref("sScale", a.annotationText);
                            }}
                          >
                            {a.annotationText}
                          </button>
                        ))
                    ))}
                </div>
                <div>
                  {(sScaleAction == "factorLoading" || sScaleAction == "itemDescription" || sScaleItem) &&
                    (sScaleItem ? (
                      <button
                        className="toolbar-button"
                        style={{ width: "unset" }}
                        onClick={() => {
                          setSScaleItem("");
                        }}
                      >
                        量表item：{sScaleItem}
                      </button>
                    ) : (
                      item
                        .getAnnotations()
                        .filter((f) => f.hasTag("量表item") && f.annotationComment.includes(`*${sScale}*`))
                        .map((a) => (
                          <button key={a.key}
                            className="toolbar-button"
                            style={{ width: "unset" }}
                            onClick={() => {
                              setSScaleItem(a.annotationText);
                              setPref("sScaleItem", a.annotationText);
                            }}
                          >
                            {a.annotationText}
                          </button>
                        ))
                    ))}
                </div>
                <div style={{ display: "flex", flexWrap: "wrap" }}>
                  {
                    //["item", "CR", "CA", "AVE", "factorLoading", "reference", "description"]//.filter(f => f != sScaleAction)
                    ScaleActionTypeArray.map((a) => (
                      <button key={a}
                        className="toolbar-button"
                        style={{ width: "unset", margin: "2px" }}
                        onClick={() => {
                          setSScaleAction(a);
                          setPref("sScaleAction", a);
                          scaleAddAnnotation(a);
                        }}
                      >
                        {sScaleAction == a ? `【${a}】` : a}
                      </button>
                    ))
                  }
                </div>
              </>
            )}
          </>
        )}
        <div
          style={{
            // marginTop: pFixedContentLocation || params.ids ? nFCLTop + "px" : "unset",
            backgroundColor: bgColor,
            opacity: 1,
            whiteSpace: "break-spaces",
            display: "flex",
            flexWrap: "wrap",
            // maxWidth: Math.max(600, maxWidth) + "px",
            // width: "600px",
            // width: divMaxWidth + "px",
            // minHeight: divMaxHeight + "px",
            // overflowY: "scroll",
          }}
          // onClick={() => setIsPopoverOpen(!isPopoverOpen)}
          onClick={() => setAutoCloseSeconds(-1)}
        >
          <div
            style={{
              fontSize: "18px",
              lineHeight: "1.5",
              // background: "#fff",
              boxShadow: params.ids ? "rgb(0, 0, 0) 0 0 3px 0px inset" : "",
              borderTop: "1px solid #000",
            }}
          >
            <span
              style={{
                display: "flex",
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              {existTags.length > 0 && (
                <span
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    fontSize: fontSize + "px",
                    lineHeight: lineHeight,
                    alignItems: "center",
                  }}
                >
                  现有标签：
                  {groupBy(existTags, (a) => a)
                    .sort(sortValuesLength)
                    .map((a) => (
                      <button
                        key={a.key}
                        className="btn"
                        style={{
                          ...tagStyle,
                          whiteSpace: "nowrap",
                          wordWrap: "normal",
                          backgroundColor: memFixedColor(a.key, ""),
                          boxShadow: "#ccc 0px 0px 4px 3px",
                        }}
                        onClick={() => {
                          updateDelTags((dt) => {
                            const i = dt.findIndex((f) => f == a.key);
                            if (i > -1) {
                              dt.splice(i, 1);
                            } else {
                              dt.push(a.key);
                            }
                          });
                        }}
                      >
                        [{a.values.length}/{existAnnotations.length}]{a.key}
                        {delTags.includes(a.key) && <span style={{ background: "#990000", color: "#fff" }}>[待删除]</span>}
                      </button>
                    ))}
                </span>
              )}
              {params.ids && (
                <>
                  <button
                    className="btn"
                    style={{
                      ...tagStyle,
                      background: delTags.length > 0 ? "#990000" : "#009900",
                      color: "#fff",
                    }}
                    onClick={() => {
                      setIsPopoverOpen(false);
                      saveAnnotationTags("", [...selectedTags], [...delTags], reader, params, doc);
                      root?.remove();
                    }}
                  >
                    {delTags.length == 0 ? (autoCloseSeconds > 0 ? autoCloseSeconds + "s" : "点击") + "关闭" : "确认删除"}
                  </button>
                  {delTags.length > 0 && (
                    <>
                      <button
                        className="btn"
                        style={{
                          ...tagStyle,
                          background: "#009900",
                          color: "#fff",
                        }}
                        onClick={() => {
                          setIsPopoverOpen(false);
                          root?.remove();
                        }}
                      >
                        关闭
                      </button>
                    </>
                  )}
                </>
              )}

              <FixedPopup defaultIsOpen={isShowConfig} openText={getString("popupRoot-setup")} top={'100px'} left={'100px'} width={''} height={''}
                onOpenChanged={(isOpen) => {
                  setPref("showConfig", isOpen);
                  setShowConfig(isOpen);
                }}
                openButtonStyle={{
                  ...tagStyle,
                  background: isShowConfig ? "#00990030" : "#99000030",
                }}

              >{handleConfigDiv()}</FixedPopup>
              {/* {color.rgb}
              <ColorPicker color={color} onChange={setColor} /> */}
              {/* <div>
                <Sketch
                  style={{ marginLeft: 20 }}
                  color={bgColor}
                  disableAlpha={false}
                  onChange={(color) => {
                    setBgColor(color.hex);
                  }}
                />
              </div> */}

              {bComment && !params.ids && (
                <input
                  type="text"
                  tabIndex={0}
                  onInput={(e) => {
                    setComment(e.currentTarget.value);
                  }}
                  autoFocus={bAutoFocus}
                  style={{ ...inputWidth(comment, 8), fontSize: fontSize }}
                  placeholder="输入注释"
                  onKeyDownCapture={(e) => {
                    ztoolkit.log("按键记录input onKeyDown", e, comment);
                    // setComment(e.currentTarget.value)
                    if (e.key == "Enter") {
                      e.preventDefault();
                      refInputTag.current?.focus();
                      return false;
                    }
                    if (bAutoFocus && !comment) {
                      //自动获得焦点的时候，使用ctrl+C复制选中文本，如果文本框没有内容复制选中的pdf文字
                      const text = params.annotation?.text;
                      if (e.ctrlKey && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "c") {
                        if (e.currentTarget.value == "" && text) {
                          ztoolkit.log("复制", e, text);
                          e.preventDefault();
                          const cb = new ztoolkit.Clipboard();
                          cb.addText(text);
                          cb.copy();
                          return false;
                        }
                      }
                    }
                    if (e.key == "Tab") {
                      if (e.preventDefault) {
                        e.preventDefault();
                      } else {
                        //@ts-ignore returnValue
                        e.returnValue = false;
                      }
                      refInputTag.current?.focus();
                    }
                  }}
                />
              )}
              {selectedTags.length > 0 && (
                <>
                  [<span></span>
                  {selectedTags.map((a) => (
                    <span
                      key={a.tag}
                      style={{
                        ...tagStyle,
                        whiteSpace: "nowrap",
                        wordWrap: "normal",
                        backgroundColor: memFixedColor(a.tag, ""),
                        boxShadow: "#ccc 0px 0px 4px 3px",
                      }}
                      onClick={(e) => {
                        const isAdd = e.ctrlKey;
                        const cTag = a.tag;
                        ctrlAddOrSaveTags(isAdd, cTag);
                      }}
                    >
                      {a.tag}
                    </span>
                  ))}
                  ]
                </>
              )}
              <input
                ref={refInputTag}
                type="text"
                tabIndex={1}
                autoFocus={bAutoFocus && (!bComment || !!params.ids)}
                key={`input${item.key}`}
                defaultValue={searchTag}
                onInput={(e) => {
                  ztoolkit.log("onInput", e.currentTarget.value, e);
                  setSearchTag(e.currentTarget.value);
                }}
                style={{ ...inputWidth(searchTag, 10), fontSize: fontSize }}
                placeholder="搜索标签"
                onKeyDownCapture={(e) => {
                  ztoolkit.log("按键记录input onKeyDown", e);
                  const searchTag = (e.target as HTMLInputElement).value;
                  // ztoolkit.log(e)
                  if (autoCloseSeconds > 0) {
                    setAutoCloseSeconds(-1);
                  }
                  if (bAutoFocus && !searchTag) {
                    //自动获得焦点的时候使用ctrl+C复制选中文本
                    const text = params.annotation?.text;
                    if (e.ctrlKey && !e.altKey && !e.shiftKey && e.key.toLowerCase() === "c") {
                      if (e.currentTarget.value == "" && text) {
                        ztoolkit.log("复制", e, text);
                        e.preventDefault();
                        const cb = new ztoolkit.Clipboard();
                        cb.addText(text);
                        cb.copy();
                        return false;
                      }
                    }
                  }
                  if (e.key == "Enter") {
                    ztoolkit.log("Enter保存", searchTag, e, params);
                    const isAdd = e.ctrlKey;
                    const cTag = searchTag;
                    ctrlAddOrSaveTags(isAdd, cTag);
                  }
                  if (e.code == "Escape") {
                    ztoolkit.log("关闭弹出框", e, params);
                    //@ts-ignore _onSetSelectionPopup
                    reader?._primaryView._onSetSelectionPopup(null);
                    root.remove();
                    return false;
                  }
                }}
                onContextMenu={(e) => {
                  e.preventDefault();
                  new window.Clipboard().readText().then((text) => {
                    ztoolkit.log("onContextMenu 复制", text);
                    (e.currentTarget as HTMLInputElement).value = text;
                  });
                  return false;
                }}
              />
              {/* <span style={tagStyle}>
                          固定标签来自【{currentPosition}】
                        </span>
                        <span style={tagStyle}>
                          相关标签来自【{currentPosition}】
                        </span> */}
              <span style={{ fontSize: fontSize }}>
                {displayTags.length}/{searchResultLength}
              </span>
              {displayTags
                .filter(() => false)
                .map((tag) => (
                  <span
                    key={tag.key}
                    // tabIndex={0}

                    style={{
                      ...tagStyle,
                      whiteSpace: "nowrap",
                      wordWrap: "normal",
                      backgroundColor: tag.color,
                      // boxShadow: "#ccc 0px 0px 4px 3px",
                      // borderRadius: "3px",
                    }}
                    className="tagButton"
                    // onClick={(e) => {
                    //   ztoolkit.log("右键 onClick", e.ctrlKey, e.buttons, e.button, e)
                    // }}
                    // onContextMenuCapture={e => {
                    //   ztoolkit.log("右键 onContextMenuCapture", e.ctrlKey, e.buttons, e.button, e)

                    // }}
                    // onContextMenu={e => {
                    //   ztoolkit.log("右键 onContextMenu", e.ctrlKey, e.buttons, e.button, e)

                    // }}
                    onClick={(e) => {
                      e.preventDefault();
                      ztoolkit.log("onClick 添加", e);
                      if (isShowConfig) return false;
                      const isAdd = e.ctrlKey;
                      const cTag = tag.key;
                      ctrlAddOrSaveTags(isAdd, cTag);
                      return false;
                    }}
                  // onMouseDown={(e) => {
                  //   e.preventDefault();
                  //   ztoolkit.log("onMouseDown 复制", e)
                  //   return false
                  // }}
                  // onContextMenu={e => {
                  //   e.preventDefault();
                  //   ztoolkit.log("onContextMenu 复制", tag.key)
                  //   new window.Clipboard().readText().then((text) => {
                  //     ztoolkit.log("onContextMenu 复制", tag.key, text);
                  //     (e.currentTarget as HTMLInputElement).value = text;
                  //   })
                  //   return false
                  // }}
                  >
                    <span>[{tag.values.length}]</span>
                    <span>{tag.key}</span>

                    {isShowConfig && (
                      <>
                        {memFixedTags().includes(tag.key) ? (
                          <>
                            {/* <ChangeColor
                            color={memFixedColor(tag.key)}
                            onChange={(e) => {
                              updateDisplayTags((a) => {
                                for (const b of a) {
                                  if (b.key == tag.key) {
                                    b.color = e;
                                  }
                                }
                              });
                            }}
                          >
                            <span style={{ background: "#fff" }}>颜色</span>
                          </ChangeColor> */}
                            {/* <span
                                                            style={{
                                                                background: "#fff",
                                                                color: "#000",
                                                                border: "1px solid #000",
                                                            }}
                                                        >
                                                            移除固定
                                                        </span>
                                                        <span
                                                            style={{
                                                                background: "#fff",
                                                                color: "#000",
                                                                border: "1px solid #000",
                                                            }}
                                                        >
                                                            左移
                                                        </span>
                                                        <span
                                                            style={{
                                                                background: "#fff",
                                                                color: "#000",
                                                                border: "1px solid #000",
                                                            }}
                                                        >
                                                            右移
                                                        </span> */}
                          </>
                        ) : (
                          <span
                            style={{
                              background: "#fff",
                              color: "#000",
                              border: "1px solid #000",
                            }}
                          >
                            {/* 设置固定 */}
                          </span>
                        )}
                      </>
                    )}
                  </span>
                ))}

              {displayTags.map((tag) => (
                <button
                  key={tag.key}
                  className="btn tagButton"
                  tabIndex={-1}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    new ztoolkit.Clipboard().addText(tag.key).copy();
                    new ztoolkit.ProgressWindow(`已复制${tag.key}`, { closeOnClick: true, closeTime: 1000 })
                      .createLine({ text: tag.key })
                      .show();
                    return false;
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    ztoolkit.log("onClick 添加", e);
                    if (isShowConfig) return false;
                    const isAdd = e.ctrlKey;
                    const cTag = tag.key;
                    ctrlAddOrSaveTags(isAdd, cTag);
                    return false;
                  }}
                  style={{
                    ...tagStyle,
                    backgroundColor: tag.color,
                  }}
                >
                  [{tag.values.length}]{tag.key}
                </button>
              ))}
            </span>
          </div>
        </div>
      </div>
    ),
    vars,
  );
  const handleConfigAndContent = React.useCallback(
    (popoverState: any) => (
      <>
        {handleConfigDiv()}
        {handleContentDiv()}
      </>
    ),
    vars,
  );

  return (
    <>
      {/* {JSON.stringify(vars)} */}

      {windowType == "FollowParent" && handleContentDiv()}
      {/* <Popover
        parentElement={parentElement}
        boundaryElement={boundaryElement}
        isOpen={isPopoverOpen}
        positions={pPositions as any}
        reposition={true}
        padding={pPadding}
        ref={refPopover}
        boundaryInset={pBoundaryInset}
        transformMode={windowType == "FixedPanel" || params.ids ? "absolute" : "relative"}
        transform={windowType == "FixedPanel" || params.ids ? { left: pFCLLeft ?? 0, top: nFCLTop ?? 0 } : undefined}
        align="start"
        onClickOutside={(e) => {
          // ztoolkit.log("onClickOutside", e);
          // setIsPopoverOpen(false)
          if (!doc.querySelector(".view-popup.selection-popup")?.contains(e.target as HTMLElement)) {
            // setIsPopoverOpen(false);
          }
        }}
        // ref={clickMeButtonRef} // if you'd like a ref to your popover's child, you can grab one here
        content={windowType == "FollowParent" && !params.ids ? handleConfigDiv : handleConfigAndContent}
        containerStyle={{
          marginTop: "42px",
        }}
      >
        <div
          ref={refPopoverDiv}
          className="popoverHolder"
          style={{
            width: "100%",
            // width: "600px",
            position: "absolute",
            height: (selectionPopupSize?.height || 120) + "px",
            top: "0",
            // background: "#f00", opacity: "0",
            zIndex: "-1",
          }}
        ></div>
      </Popover> */}

      <div
        ref={refPopoverDiv}
        className="popoverHolder"
        style={{
          width: "100%",
          // width: "600px",
          position: "absolute",
          height: (selectionPopupSize?.height || 120) + "px",
          top: "0",
          // background: "#f00", opacity: "0",
          zIndex: "-1",
        }}
      ></div>
    </>
  );

  function scaleAddAnnotation(action: ScaleActionType | ScaleItemActionType) {
    // const action = sScaleAction
    if (action == "factorLoading" || action == "itemDescription") {
      if (sScaleItem) {
        setIsPopoverOpen(false);
        saveAnnotationTags("量表" + action, [...selectedTags], [...delTags], reader, params, doc, undefined, `*${sScaleItem}*`);
      }
    } else {
      if (sScale) {
        setIsPopoverOpen(false);
        saveAnnotationTags("量表" + action, [...selectedTags], [...delTags], reader, params, doc, undefined, `*${sScale}*`);
      }
    }
  }

  function ctrlAddOrSaveTags(onlyAdd: boolean, cTag: string) {
    ztoolkit.log("isSaveTag", selectedTags, cTag, onlyAdd);
    if (onlyAdd) {
      updateSelectedTags(() => {
        const a = selectedTags;
        const i = a.findIndex((a) => a.tag == cTag);
        ztoolkit.log("updateSelectedTags", a, selectedTags, cTag, onlyAdd, i);
        if (i > -1) {
          a.splice(i, 1);
        } else {
          a.splice(999, 0, { tag: cTag, color: memFixedColor(cTag) });
        }
        return [...a];
      });
    } else {
      setIsPopoverOpen(false);
      //@ts-ignore 访问_onSetSelectionPopup 隐藏弹出框
      // reader?._primaryView?._onSetSelectionPopup?.(null);
      saveAnnotationTags(
        "",
        [...selectedTags, { tag: cTag, color: memFixedColor(cTag) }],
        [...delTags],
        reader,
        params,
        doc,
        undefined,
        comment,
      );

      if (params.ids) {
        root.remove();
      }
    }
  }
  function selectConfig(config: Config) {
    // setShowConfig(false);
    setPref("showConfig", false);

    setPref("isCtrlAdd", false);
    setIsCtrlAdd(config.isCtrlAdd);

    setConfigName(config.configName);
    setPref("configName", config.configName);

    setBgColor(config.bgColor);
    setPref("bgColor", config.bgColor);

    setDivMaxWidth(config.divMaxWidth);
    setPref("divMaxWidth", config.divMaxWidth);

    setAutoCloseSeconds(config.autoCloseSeconds);
    setPref("autoCloseSeconds", config.autoCloseSeconds);

    setPref("windowType", config.windowType);
    setWindowType(config.windowType);
    // setPFixedContentLocation(config.pFixedContentLocation);
    // setPref("pFixedContentLocation", config.pFixedContentLocation);
    // setPSingleWindow(config.pSingleWindow);
    // setPref("pSingleWindow", config.pSingleWindow);

    setFCLLeft(config.pFCLLeft);
    setPref("pFCLLeft", config.pFCLLeft);

    setFCLTop(config.nFCLTop);
    setPref("nFCLTop", config.nFCLTop);

    setPBoundaryInset(config.pBoundaryInset);
    setPref("pBoundaryInset", config.pBoundaryInset);

    setPArrowSize(config.pArrowSize);
    setPref("pArrowSize", config.pArrowSize);

    // updatePPositions((pPositions) => config.pPositions);
    setPref("pPositions", config.pPositions);

    setShowSelectedPopupColorsTag(config.isShowSelectedPopupColorsTag);
    setPref("isShowSelectedPopupColorsTag", config.isShowSelectedPopupColorsTag);

    setShowSelectedPopupMatchTag(config.isShowSelectedPopupMatchTag);
    setPref("isShowSelectedPopupMatchTag", config.isShowSelectedPopupMatchTag);

    setShowTagsLength(config.showTagsLength);
    setPref("showTagsLength", config.showTagsLength);

    setFontSize(config.fontSize);
    setPref("fontSize", config.fontSize);

    setLineHeight(config.lineHeight);
    setPref("lineHeight", config.lineHeight);

    setbtnMarginTB(config.btnMarginTB);
    setPref("btnMarginTB", config.btnMarginTB);

    setbtnMarginLR(config.btnMarginLR);
    setPref("btnMarginLR", config.btnMarginLR);

    setbtnPaddingTB(config.btnPaddingTB);
    setPref("btnPaddingTB", config.btnPaddingTB);

    setbtnPaddingLR(config.btnPaddingLR);
    setPref("btnPaddingLR", config.btnPaddingLR);

    setButtonBorderRadius(config.buttonBorderRadius);
    setPref("buttonBorderRadius", config.buttonBorderRadius);

    setSortType(config.sortType);
    setPref("sortType", config.sortType);
    // setTimeout(() => setShowConfig(true));
  }
  function inputWidth(searchTag: string, minChar = 3) {
    return {
      width: `${Math.min(searchTag.length + (searchTag.match(/[\u4E00-\u9FA5]/g) || "").length + 2)}ch`,
      minWidth: minChar + "ch",
      maxWidth: "100%",
    };
  }
  function handleInput<T>(prefName: string, setStateFunc: (value: React.SetStateAction<T>) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setPref(prefName, e.target.value);
      setStateFunc(e.target.value as T);
    };
  }
  function handleInputNumber(prefName: string, setStateFunc: (value: React.SetStateAction<number>) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.value) {
        setPref(prefName, e.target.valueAsNumber);
        setStateFunc(e.target.valueAsNumber);
      }
    };
  }
  function handleInputBoolean(prefName: string, setStateFunc: (value: React.SetStateAction<boolean>) => void) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setPref(prefName, e.currentTarget.checked);
      setStateFunc(e.currentTarget.checked);
    };
  }
}
