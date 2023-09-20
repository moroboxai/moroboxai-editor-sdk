/**
 * Version of the SDK.
 */
export const VERSION: string = "__VERSION__";

export type Language = "javascript" | "lua";

export const DEFAULT_LANGUAGE: Language = "javascript";

export interface OnLoadCallback {
    (language: Language, value: string): void;
}

export interface OnUnloadCallback {
    (): void;
}

export interface IEditorOptions {
    element?: Element | Element[] | HTMLCollectionOf<Element>;
    // Language of the script
    language?: Language;
    // URL of the script to load
    url?: string;
    // Direct script
    value?: string;
    // Width of the editor
    width?: string;
    // Height of the editor
    height?: string;
    onLoad?: OnLoadCallback;
    onUnload?: OnUnloadCallback;
}

export interface IEditorInstance {
    language: Language;
    value: string;
    remove(): void;
}

export interface IEditorFactoryOptions {
    element: HTMLElement;
    language: Language;
}

export interface IEditorFactory {
    (options: IEditorFactoryOptions): IEditorInstance;
}

export interface IEditor {
    // Get/Set the language
    language: Language;

    // Get/Set the URL of the code
    url?: string;

    // Get/Set the text
    value: string;

    /**
     * Register the onLoad callback.
     * @param {Function} callback - Callback
     */
    onLoad(callback?: OnLoadCallback): void;

    /**
     * Register the onUnload callback.
     */
    onUnload(callback?: OnUnloadCallback): void;

    /**
     * Remove the editor from document.
     */
    remove(): void;
}

function createElement(tagName: string, className?: string): HTMLElement {
    const el = document.createElement(tagName);
    if (className !== undefined) {
        el.classList.add(className);
    }
    return el;
}

const STYLES = {
    root: {
        "background-color": "#1e1e1e",
        overflow: "hidden"
    },
    body: {
        width: "100%",
        height: "100%",
        display: "flex",
        "flex-direction": "column"
    },
    toolbar: {
        "flex-grow": "1",
        "padding-left": "1em",
        "padding-right": "1em",
        "padding-top": "0.5em",
        "padding-bottom": "1em",
        display: "flex",
        "flex-direction": "row",
        gap: "0.5em"
    },
    language: {
        "font-weight": "bold",
        color: "#4e6c8b",
        "flex-grow": "1",
        "text-align": "right"
    },
    editor: {
        width: "100%",
        height: "100%"
    }
};

export class Editor implements IEditor {
    private _factory: IEditorFactory;
    private _options: IEditorOptions;
    private _ui: {
        element?: HTMLElement;
        base?: HTMLDivElement;
        toolbar?: HTMLDivElement;
        loadButton?: HTMLInputElement;
        unloadButton?: HTMLInputElement;
        wrapper?: HTMLDivElement;
        editor?: IEditorInstance;
    } = {};
    private _onLoadCallback?: OnLoadCallback;
    private _onUnloadCallback?: OnUnloadCallback;

    constructor(
        factory: IEditorFactory,
        element: Element,
        options: IEditorOptions
    ) {
        this._factory = factory;
        this._options = options;

        this._onLoadCallback = options.onLoad;
        this._onUnloadCallback = options.onUnload;

        if (isHTMLElement(element)) {
            this._ui.element = element as HTMLElement;
            this._options = { ...options };

            this._attach();
        }
    }

    private _attach() {
        if (this._ui.element === undefined) {
            return;
        }

        {
            const div = createElement(
                "div",
                "moroboxai-editor"
            ) as HTMLDivElement;
            Object.assign(div.style, STYLES["root"]);

            if (this._options.width !== undefined) {
                div.style.width = this._options.width;
            }

            if (this._options.height !== undefined) {
                div.style.height = this._options.height;
            }

            this._ui.base = div;
            this._ui.element.appendChild(div);
        }

        {
            const body = createElement(
                "div",
                "moroboxai-body"
            ) as HTMLDivElement;
            Object.assign(body.style, STYLES["body"]);
            this._ui.base.appendChild(body);

            {
                const div = createElement(
                    "div",
                    "moroboxai-toolbar"
                ) as HTMLDivElement;
                Object.assign(div.style, STYLES["toolbar"]);
                this._ui.toolbar = div;
                body.appendChild(div);
            }

            {
                const div = createElement("div") as HTMLDivElement;
                Object.assign(div.style, STYLES["editor"]);

                this._ui.wrapper = div;
                body.appendChild(div);
            }
        }

        {
            const input = createElement("input") as HTMLInputElement;
            input.type = "button";
            input.value = "Load";
            input.onclick = () => this._notifyLoad();
            this._ui.loadButton = input;
            this._ui.toolbar.appendChild(input);
        }

        {
            const input = createElement("input") as HTMLInputElement;
            input.type = "button";
            input.value = "Unload";
            input.onclick = () => this._notifyUnload();
            this._ui.unloadButton = input;
            this._ui.toolbar.appendChild(input);
        }

        {
            const span = createElement(
                "span",
                "moroboxai-language"
            ) as HTMLSpanElement;
            Object.assign(span.style, STYLES["language"]);
            span.textContent = "Javascript";
            this._ui.toolbar.appendChild(span);
        }

        {
            this._ui.editor = this._factory({
                element: this._ui.wrapper,
                language: this._options.language || DEFAULT_LANGUAGE
            });

            this._ui.editor.value = this._options.value || "";
            this.url = this._options.url;
        }
    }

    private _notifyLoad() {
        if (this._onLoadCallback) {
            this._onLoadCallback("javascript", this.value);
        }
    }

    private _notifyUnload() {
        if (this._onUnloadCallback) {
            this._onUnloadCallback();
        }
    }

    // IEditor functions
    get language(): Language {
        if (this._ui.editor !== undefined) {
            return this._ui.editor.language;
        }

        return DEFAULT_LANGUAGE;
    }

    set language(value: Language) {
        if (this._ui.editor !== undefined) {
            this._ui.editor.language = value;
        }
    }

    get url(): string | undefined {
        return this._options.url;
    }

    set url(value: string | undefined) {
        this._options.url = value;
        if (this._options.url === undefined) {
            return;
        }

        fetch(this._options.url)
            .then((response) => response.text())
            .then((text) => (this.value = text));
    }

    get value(): string {
        if (this._ui.editor !== undefined) {
            return this._ui.editor.value;
        }

        return "";
    }

    set value(text: string) {
        if (this._ui.editor !== undefined) {
            this._ui.editor.value = text;
        }
    }

    onLoad(callback?: OnLoadCallback): void {
        this._onLoadCallback = callback;
    }

    onUnload(callback?: OnUnloadCallback): void {
        this._onUnloadCallback = callback;
    }

    remove() {
        if (this._ui.editor !== undefined) {
            this._ui.editor.remove();
            this._ui.editor = undefined;
        }

        if (this._ui.base !== undefined) {
            this._ui.base.remove();
            this._ui.base = undefined;
        }
    }
}

/**
 * Get default configured editor options.
 * @returns {IEditorOptions} Default options
 */
export function defaultOptions(): IEditorOptions {
    return {
        language: DEFAULT_LANGUAGE
    };
}

function isEditorOptions(
    _?: IEditorOptions | Element | Element[] | HTMLCollectionOf<Element>
): _ is IEditorOptions {
    return _ !== undefined && !isElementArray(_) && !("className" in _);
}

function isHTMLElement(_: Element | HTMLElement): _ is HTMLElement {
    return "dataset" in _;
}

function isElementArray(
    _: IEditorOptions | Element | Element[] | HTMLCollectionOf<Element>
): _ is Element[] | HTMLCollectionOf<Element> {
    return "length" in _;
}

function createEditor(
    factory: IEditorFactory,
    element: Element,
    options: IEditorOptions
): IEditor {
    return new Editor(factory, element, options);
}

/**
 * Initialize editor on one or multiple HTML elements.
 * @param {IEditorFactory} factory How to create the editor
 * @param {HTMLElement} element Element to wrap
 * @param {IEditor} options Options for initializing the editor
 */
export function init(
    factory: IEditorFactory,
    element:
        | IEditorOptions
        | Element
        | Element[]
        | HTMLCollectionOf<Element>
        | undefined,
    options?: IEditorOptions
): IEditor | IEditor[] {
    let _elements: undefined | Element | Element[] | HTMLCollectionOf<Element> =
        undefined;
    let _options: IEditorOptions = defaultOptions();

    if (isEditorOptions(element)) {
        options = element;
    } else {
        _elements = element;
    }

    if (options !== undefined) {
        _options = { ..._options, ...options };
    }

    if (_elements == undefined) {
        if (_options.element !== undefined) {
            _elements = _options.element;
        } else {
            _elements = document.getElementsByClassName("moroboxai-editor");
        }
    }

    if (!isElementArray(_elements)) {
        return createEditor(factory, _elements, _options);
    }

    return Array.prototype.map.call(_elements, (_) =>
        createEditor(factory, _, _options)
    ) as IEditor[];
}
