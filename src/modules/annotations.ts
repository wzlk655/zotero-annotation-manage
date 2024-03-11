import { TagElementProps } from "zotero-plugin-toolkit/dist/tools/ui";
import { config } from "../../package.json";
import {
  sortByTAGs,
  groupBy,
  groupByResult,
  getFixedTags,
  getChildCollections,
  uniqueBy,
  getFixedColor,
  delayLoad,
  delayLoadAsync,
} from "../utils/zzlb";
import { getPref } from "../utils/prefs";
function register() {
  // if (!getPref("enable")) return;
  // ztoolkit.UI.basicOptions.log.disableZLog = true;
  ztoolkit.log("Annotations register");
  Zotero.Reader.registerEventListener(
    "renderTextSelectionPopup",
    renderTextSelectionPopup,
  );
  Zotero.Reader.registerEventListener(
    "createAnnotationContextMenu",
    createAnnotationContextMenu,
  );
  allTagsInLibraryGet(2000, "初始化");
}
function unregister() {
  ztoolkit.log("Annotations unregister");
  Zotero.Reader.unregisterEventListener(
    "renderTextSelectionPopup",
    renderTextSelectionPopup,
  );
  Zotero.Reader.unregisterEventListener(
    "createAnnotationContextMenu",
    createAnnotationContextMenu,
  );
}
function relateTags(item: Zotero.Item) {
  const allCollectionIds: number[] = [];
  const recursiveCollections = !!Zotero.Prefs.get("recursiveCollections");
  const prefSelectedCollection = !!getPref("selectedCollection");
  const prefCurrentCollection = !!getPref("currentCollection");

  if (prefSelectedCollection) {
    const selectedCollectionId = ZoteroPane.getSelectedCollection(true);
    if (selectedCollectionId) allCollectionIds.push(selectedCollectionId);
  }
  if (prefCurrentCollection) {
    const currentCollectionIds = item.parentItem
      ? item.parentItem.getCollections()
      : item.getCollections();
    allCollectionIds.push(...currentCollectionIds);
  }
  if (allCollectionIds.length > 0) {
    const allCollections = Zotero.Collections.get(
      allCollectionIds,
    ) as Zotero.Collection[];
    const collections = recursiveCollections
      ? [...allCollections, ...getChildCollections(allCollections)]
      : allCollections;
    return getTagsInCollections(uniqueBy(collections, (u) => u.key));
  }
  return [];
}
function getTagsInCollections(collections: Zotero.Collection[]) {
  const pdfIds = collections
    .flatMap((c) => c.getChildItems())
    .filter((f) => !f.isAttachment())
    .flatMap((a) => a.getAttachments(false)); //为啥会出现
  const pdfItems = Zotero.Items.get(pdfIds).filter(
    (f) => f.isFileAttachment() && f.isAttachment(),
  );
  const annotations = pdfItems.flatMap((f) => f.getAnnotations(false));
  //.sort((a, b) => (a.dateModified < b.dateModified ? 1 : -1))
  //.slice(0,100)
  const tags = annotations.flatMap((f) => f.getTags());

  ztoolkit.log(
    collections.map((a) => a.name),
    getPref("selectedCollection"),
    getPref("currentCollection"),
  );
  return tags;
}
function includeTAGS<T>(tagGroup: groupByResult<T>[]) {
  getFixedTags().forEach((tag) => {
    if (tagGroup.findIndex((f) => f.key == tag) == -1) {
      tagGroup.push({ key: tag, values: [] });
    }
  });
  return tagGroup;
}
function getTranslate(t1: HTMLElement) {
  for (const k in t1.style) {
    const v = t1.style[k];
    if (k == "transform" && v) {
      //没有附加到Dom无法调用 new WebKitCSSMatrix，只能这样使用
      ("translate(26.0842px, 108.715px)");
      const translateLeftTop = v.match(
        /translate[(]([\d.]*)px,\s?([\d.]*)px[)]/,
      );
      //['translate(26.0842px, 108.715px)', '26.0842', '108.715', index: 0, input: 'translate(26.0842px, 108.715px)', groups: undefined]
      if (translateLeftTop && translateLeftTop.length > 2) {
        return {
          x: parseFloat(translateLeftTop[1]),
          y: parseFloat(translateLeftTop[2]),
        };
      }
    }
  }
  return { x: 0, y: 0 };
}
function getLeftTop(temp4: HTMLElement) {
  try {
    let t1 = temp4;
    let left = 0;
    let top = 0;
    const width = temp4.clientWidth;
    const height = temp4.clientHeight;
    while (t1) {
      const ts = getTranslate(t1);
      left += ts.x;
      top += ts.y;
      left += t1.offsetLeft;
      top += t1.offsetTop;
      if (!t1.parentElement || t1.className == "primary") break;
      t1 = t1.parentElement;
    }
    const { clientWidth, clientHeight } = t1;
    return { left, top, width, height, clientWidth, clientHeight };
  } catch (error) {
    ztoolkit.log("无法计算", error);
    return false;
  }
}
function allTagsInLibraryGet(time = 1000, msg = "") {
  setTimeout(async () => await getAllTags(), time);
  async function getAllTags() {
    if (Date.now() - allTagsInLibraryTime < 10000) return allTagsInLibrary;
    allTagsInLibraryTime = Date.now();
    // const libraryID = Zotero.Libraries.getAll().map((a) => a.libraryID)[0];
    const allItems = await Zotero.Items.getAll(1, false, false, false);
    const items = allItems.filter((f) => !f.parentID && !f.isAttachment());
    const pdfIds = items.flatMap((f) => f.getAttachments(false));
    const pdfs = Zotero.Items.get(pdfIds);
    const tags = pdfs
      .filter((f) => f.isPDFAttachment())
      .flatMap((f) => f.getAnnotations())
      .flatMap((f) => f.getTags());
    const itemTags = getPref("item-tags")
      ? items.flatMap((f) => f.getTags())
      : [];
    allTagsInLibrary = groupBy([...tags, ...itemTags], (t) => t.tag);
    ztoolkit.log("重新加载getAllTags", msg, tags, itemTags, allTagsInLibrary);
    // allTagsInLibrary.sort(sortByTAGs) 会产生性能问题
    return allTagsInLibrary;
  }
}
let allTagsInLibraryTime = -1;
let allTagsInLibrary: groupByResult<{
  tag: string;
  type: number;
}>[] = [];
const allTagsInLibraryAsync = delayLoadAsync(async () => {
  const allItems = await Zotero.Items.getAll(1, false, false, false);
  const items = allItems.filter((f) => !f.parentID && !f.isAttachment());
  const pdfIds = items.flatMap((f) => f.getAttachments(false));
  const pdfs = Zotero.Items.get(pdfIds);
  const tags = pdfs
    .filter((f) => f.isPDFAttachment())
    .flatMap((f) => f.getAnnotations())
    .flatMap((f) => f.getTags());
  const itemTags = getPref("item-tags")
    ? items.flatMap((f) => f.getTags())
    : [];
  return groupBy([...tags, ...itemTags], (t) => t.tag);
});

function createDiv(
  doc3: Document,
  reader: _ZoteroTypes.ReaderInstance,
  params: any, // { annotation?: any; ids?: string[]; currentID?: string; x?: number; y?: number; },
) {
  const isExistAnno = !!params.ids;
  allTagsInLibraryGet(1, "选中文字弹出");
  const doc = reader._iframeWindow?.document;
  if (!doc) return;
  if (
    doc.getElementById(`${config.addonRef}-reader-div`)?.parentElement
      ?.nodeName == "BODY"
  )
    doc.getElementById(`${config.addonRef}-reader-div`)?.remove();
  else
    doc
      .getElementById(`${config.addonRef}-reader-div`)
      ?.parentElement?.remove();
  const bShowAllTags = !!getPref("showAllTags");
  const fontSize =
    Zotero.Prefs.get(`extensions.zotero.ZoteroPDFTranslate.fontSize`, true) +
    "px";
  let tags1: groupByResult<{
    tag: string;
    type: number;
  }>[] = [];
  if (bShowAllTags) {
    if (allTagsInLibrary.length == 0) {
      allTagsInLibraryGet(1000, "弹出窗口时发现为空");
      tags1 = groupBy(relateTags(reader._item), (t) => t.tag);
    } else {
      tags1 = allTagsInLibrary;
    }
  } else {
    tags1 = groupBy(relateTags(reader._item), (t) => t.tag);
  }
  // ztoolkit.log(tags1,getPref("selectedCollection"),getPref("currentCollection"))
  includeTAGS(tags1);
  tags1.sort(sortByTAGs);
  const existAnnotations = isExistAnno
    ? reader._item.getAnnotations().filter((f) => params.ids.includes(f.key))
    : [];

  const {
    clientWidthWithoutSlider,
    scaleFactor,
    clientWidthWithSlider,
    pageLeft,
  } = getPrimaryViewDoc(doc);
  let maxWidth = 666;
  const styles: Partial<CSSStyleDeclaration> = {
    // width: "calc(100% - 4px)",
    // maxWidth: maxWidth + "px",
    background: "#eeeeee",
    border: "#cc9999",
    // boxShadow: "#666666 0px 0px 6px 4px",
    overflowY: "scroll",
    maxHeight: "350px",
  };
  if (isExistAnno) {
    styles.zIndex = "99990";
    styles.position = "fixed";
    styles.top = params.y + "px";
    styles.left = params.x + "px"; //只有左边需要改，其它的固定
    //对已有标签处理 防止出现右边超出边界
    if (params.x > clientWidthWithSlider - maxWidth) {
      styles.left = clientWidthWithSlider - maxWidth - 23 + "px";
    }
  } else {
    //找到弹出框的中心点
    const centerX =
      ((params.annotation?.position?.rects[0][0] +
        params.annotation?.position?.rects[0][2]) *
        scaleFactor) /
        2 +
      pageLeft;
    maxWidth =
      Math.min(
        centerX * 2,
        (clientWidthWithoutSlider - centerX) * 2,
        clientWidthWithoutSlider,
      ) *
        0.75 +
      50;
    //这个应该可以更精准的计算。但是不会啊
  }
  styles.maxWidth = maxWidth + "px";
  let searchTag = "";
  const selectedTags: { tag: string; color: string }[] = [];
  let tagsDisplay: groupByResult<{ tag: string; type: number }>[] = [];
  searchTagResult();
  const div = ztoolkit.UI.createElement(doc, "div", {
    namespace: "html",
    id: `${config.addonRef}-reader-div`,
    classList: ["toolbar1", `${config.addonRef}-reader-div`],
    properties: {
      tabIndex: -1,
    },
    styles,
    children: [createSearchDiv(), createTagsDiv()],
  });
  return div;

  function createSearchDiv(): TagElementProps {
    return {
      tag: "div",
      styles: {
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-start",
        maxWidth: maxWidth + "px",
      },
      children: [
        {
          tag: "input",
          styles: { flex: "1", fontSize },
          listeners: [
            {
              type: "keyup",
              listener: (e: Event) => {
                const target = e.target as HTMLInputElement;
                ztoolkit.log(e);
                searchTag = target.value.trim();
                const { keyCode } = e as any;
                if (keyCode == 13) {
                  onTagClick(searchTag);
                }
                if (doc?.getElementById(`${config.addonRef}-reader-div-tags`)) {
                  searchTagResult();
                  ztoolkit.UI.replaceElement(
                    createTagsDiv(),
                    doc.getElementById(`${config.addonRef}-reader-div-tags`)!,
                  );
                }
              },
            },
          ],
          properties: { textContent: searchTag },
        },
        {
          tag: "div",
          styles: { display: "flex" },
          children: [
            {
              tag: "button",
              properties: {
                textContent: getPref("multipleTags")
                  ? "添加多个标签"
                  : "单标签",
              },
              styles: {
                margin: "2px",
                padding: "2px",
                border: "1px solid #dddddd",
                background: "#99aa66",
                fontSize,
              },
              listeners: [
                {
                  type: "click",
                  listener: (e: Event) => {
                    // if (searchTag) onTagClick(searchTag, getFixedColor(searchTag));
                    saveAnnotationTags();
                  },
                },
              ],
            },
            {
              tag: "button",
              properties: {
                textContent: "关闭",
              },
              styles: {
                margin: "2px",
                padding: "2px",
                border: "1px solid #dddddd",
                background: "#99aa66",
                fontSize,
              },
              listeners: [
                {
                  type: "click",
                  listener: (e: Event) => {
                    div?.remove();
                    //@ts-ignore 隐藏弹出框
                    reader._primaryView._onSetSelectionPopup(null);
                  },
                },
              ],
            },
          ],
        },
        {
          tag: "div",
          id: `${config.addonRef}-reader-div-selected-tags`,
          styles: { display: "flex", justifyContent: "space-between" },
        },
      ],
    };
  }

  function searchTagResult() {
    if (allTagsInLibrary.length == 0) {
      allTagsInLibraryGet(1000, "查询时发现为空");
    }
    const tags2 = allTagsInLibrary.length == 0 ? tags1 : allTagsInLibrary;
    const tags3 = searchTag
      ? tags2.filter((f) => RegExp(searchTag, "i").test(f.key))
      : tags1;
    tagsDisplay = tags3.slice(1, 100);
  }

  function createTagsDiv(): TagElementProps {
    const children = tagsDisplay.map((label) => {
      const tag = label.key;
      const allHave = isAllHave(tag);
      const noneHave = isNoneHave(tag);
      const someHave = strSomeHave(tag);
      const bgColor = getFixedColor(tag, "");
      return {
        tag: "span",
        namespace: "html",
        classList: ["toolbarButton1"],
        properties: {
          textContent: `${allHave ? "[x]" : noneHave ? "" : `[${someHave}]`}[${label.values.length}]${tag}`,
        },
        styles: {
          margin: "2px",
          padding: "2px",
          background: bgColor,
          fontSize,
          boxShadow: "#999999 0px 0px 3px 3px",
          borderRadius: "6px",
        },
        listeners: [
          {
            type: "click",
            listener: (e: Event) => {
              ztoolkit.log("增加标签", label, params, e);
              onTagClick(tag, bgColor);
            },
          },
        ],
      };
    });
    return {
      tag: "div",
      namespace: "html",
      id: `${config.addonRef}-reader-div-tags`,
      styles: {
        display: "flex",
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-start",
        fontSize,
      },
      children,
    };
  }

  function strSomeHave(tag: string) {
    return (
      existAnnotations.filter((a) => a.hasTag(tag)).length +
      "/" +
      existAnnotations.length
    );
  }

  function isNoneHave(tag: string) {
    return (
      existAnnotations.length == 0 ||
      existAnnotations.every((a) => !a.hasTag(tag))
    );
  }

  function isAllHave(tag: string) {
    return (
      existAnnotations.length > 0 &&
      existAnnotations.every((a) => a.hasTag(tag))
    );
  }
  function onTagClick(tag: string, color: string = "") {
    if (doc && selectedTags.every((s) => s.tag != tag)) {
      selectedTags.push({ tag, color: color || getFixedColor(tag) });
      ztoolkit.UI.appendElement(
        {
          tag: "span",
          namespace: "html",
          properties: { textContent: tag },
          styles: {
            background: color,
            margin: "3px",
            padding: "2px",
            borderRadius: "6px",
            fontSize,
          },
          listeners: [
            {
              type: "click",
              listener: (ev) => {
                const ele = ev.target as HTMLSpanElement;
                ele.remove();
                selectedTags.splice(
                  selectedTags.findIndex((f) => f.tag == tag),
                  1,
                );
              },
            },
          ],
        },
        doc.getElementById(`${config.addonRef}-reader-div-selected-tags`)!,
      );
    }
    if (!getPref("multipleTags")) {
      saveAnnotationTags();
    }
  }

  function saveAnnotationTags() {
    if (selectedTags.length == 0 && searchTag) {
      selectedTags.push({ tag: searchTag, color: getFixedColor(searchTag) });
    }
    if (selectedTags.length == 0) return;

    const bCombine = !!getPref("combine-nested-tags");
    const bKeepFirst = !!getPref("split-nested-tags-keep-first");
    const bKeepSecond = !!getPref("split-nested-tags-keep-second");
    const bKeepAll = !!getPref("split-nested-tags-keep-all");
    const sTags = selectedTags.map((a) => a.tag);
    const splitTags = sTags
      .filter((f) => f && f.startsWith("#") && f.includes("/"))
      .map((a) => a.replace("#", "").split("/"))
      .flatMap((a) =>
        bKeepAll ? a : [bKeepFirst ? a[0] : "", bKeepSecond ? a[1] : ""],
      );
    const nestedTags: string[] = bCombine ? getNestedTags(sTags) : [];

    const tagsRequired = uniqueBy(
      [...sTags, ...nestedTags, ...splitTags].filter((f) => f),
      (u) => u,
    );
    ztoolkit.log("需要添加的tags", selectedTags, tagsRequired);
    if (isExistAnno) {
      for (const annotation of existAnnotations) {
        for (const selectedTag of tagsRequired) {
          const tag = selectedTag;
          if (isAllHave(tag)) {
            //全部都有则删除
            // annotation.removeTag(tag);
          } else {
            //部分有则添加
            if (!annotation.hasTag(tag)) {
              annotation.addTag(tag, 0);
            }
          }
        }

        annotation.saveTx(); //增加每一个都要保存，为啥不能批量保存？
      }
      div?.remove();
    } else {
      const color =
        selectedTags.map((a) => a.color).filter((f) => f)[0] ||
        getFixedColor(tagsRequired[0]);
      const tags = tagsRequired.map((a) => ({ name: a }));
      // 因为线程不一样，不能采用直接修改params.annotation的方式，所以直接采用新建的方式保存笔记
      // 特意采用 Components.utils.cloneInto 方法
      reader._annotationManager.addAnnotation(
        Components.utils.cloneInto({ ...params.annotation, color, tags }, doc),
      );
      //@ts-ignore 隐藏弹出框
      reader._primaryView._onSetSelectionPopup(null);
    }
    allTagsInLibraryGet(3000, "添加或者修改操作完毕");
  }
}

function getNestedTags(arr: string[]) {
  const filterArr = arr.filter(
    (f) => f && !f.startsWith("#") && !f.includes("/"),
  );
  const list: string[] = [];
  for (const t1 of filterArr) {
    for (const t2 of filterArr) {
      if (t1 != t2) {
        const nTag = `#${t1}/${t2}`;
        if (allTagsInLibrary.some((s) => s.key == nTag)) {
          list.push(nTag);
        }
      }
    }
  }
  return list;
}

function getPrimaryViewDoc(doc: Document) {
  const pvDoc =
    (doc.querySelector("#primary-view iframe") as HTMLIFrameElement)
      ?.contentDocument || doc;
  const scaleFactor =
    parseFloat(
      (pvDoc.querySelector("#viewer") as HTMLElement)?.style.getPropertyValue(
        "--scale-factor",
      ),
    ) || 1;
  const clientWidthWithSlider = doc.body.clientWidth; //包括侧边栏的宽度
  const clientWidthWithoutSlider = pvDoc.body.clientWidth; //不包括侧边栏的宽度
  const pageLeft =
    (pvDoc.querySelector("#viewer .page") as HTMLElement)?.offsetLeft || 0;
  return {
    clientWidthWithoutSlider,
    scaleFactor,
    clientWidthWithSlider,
    pageLeft,
  };
}

function renderTextSelectionPopup(
  event: _ZoteroTypes.Reader.EventParams<"renderTextSelectionPopup">,
) {
  const { append, reader, doc, params } = event;
  // ztoolkit.log(
  //   "renderTextSelectionPopup show",
  //   event,
  //   event.params.annotation.tags,
  // );
  const div = createDiv(doc, reader, params);
  if (div) {
    setTimeout(() => updateDivWidth(div), 1000);
    append(div);
  }
}
function updateDivWidth(div: HTMLElement, n = 3) {
  //TODO 这样更新大小好像没起到效果。估计还要换个思路
  if (n < 0) return;
  if (!div.parentElement || div.ownerDocument == null) {
    setTimeout(() => updateDivWidth(div, n - 1), 1000);
    return;
  }
  const leftTop = getLeftTop(div);

  // ztoolkit.log(div.clientWidth, d, n);
  if (!leftTop || !leftTop.clientWidth) {
    setTimeout(() => updateDivWidth(div, n - 1), 1000);
    return;
  }
  const centerX = div.clientWidth / 2 + leftTop.left;
  if (centerX > 0) {
    const maxWidth =
      Math.min(centerX, leftTop.clientWidth - centerX) * 2 + "px";
    // div.style.setProperty("max-width", maxWidth);
    // div.style.maxWidth = maxWidth;
    ztoolkit.log(
      "updateDivWidth",
      // div.style,
      { centerX, maxWidth, n },
      leftTop,
    );
  }
}
function createAnnotationContextMenu(
  event: _ZoteroTypes.Reader.EventParams<"createAnnotationContextMenu">,
) {
  const { reader, params, append } = event;
  const doc = reader._iframeWindow?.document;
  if (!doc) return;
  //这里不能用异步
  const annotations = reader._item
    .getAnnotations()
    .filter((f) => params.ids.includes(f.key));
  const tags1 = groupBy(
    annotations.flatMap((f) => f.getTags()),
    (t) => t.tag,
  ).sort(sortByTAGs);
  const hasTags = tags1.map((f) => `${f.key}[${f.values.length}]`).join(",");
  const label = hasTags ? `添加标签，已有【${hasTags}】` : "添加标签";
  append({
    label: label,
    onCommand: () => {
      // ztoolkit.log("测试添加标签");
      const div = createDiv(doc, reader, params);
      if (div) {
        doc.body.appendChild(div);

        // setTimeout(() => div?.remove(), 10000);
      }
    },
  });
}
export default { register, unregister };
