/**
 * Version of the SDK.
 */
export const VERSION: string = "__VERSION__";

export type Language = "javascript" | "lua";

interface LanguageOptions {
    name: string;
    language: Language;
    ext: string;
    style: any;
}
const LANGUAGE_OPTIONS: { [language: string]: LanguageOptions } = {
    javascript: {
        name: "Javascript",
        language: "javascript",
        ext: "js",
        style: {
            color: "#888b4e"
        }
    },
    lua: {
        name: "Lua",
        language: "lua",
        ext: "lua",
        style: {
            color: "#4e6c8b"
        }
    }
};

export const DEFAULT_LANGUAGE: Language = "javascript";

export interface OnRunOptions {
    language?: Language;
    script: string;
}

export interface OnRunCallback {
    (options: OnRunOptions): void;
}

export interface OnStopCallback {
    (): void;
}

export interface OnLanguageChangedCallback {
    (language: Language): void;
}

export interface URLFactory {
    (language: Language): string | undefined;
}

export interface ValueFactory {
    (language: Language): string | undefined;
}

export interface EditorOptions {
    element?: Element | Element[] | HTMLCollectionOf<Element>;
    // Default selected language
    language?: Language;
    // URL of the code to load
    url?: string | URLFactory;
    // Direct code
    value?: string | ValueFactory;
    // Width of the editor
    width?: string;
    // Height of the editor
    height?: string;
    onRun?: OnRunCallback;
    onStop?: OnStopCallback;
    onLanguageChanged?: OnLanguageChangedCallback;
}

export interface IEditorInstance {
    language: Language;
    value: string;
    resize(): void;
    remove(): void;
}

export interface EditorFactoryOptions {
    element: HTMLElement;
    language: Language;
}

export interface IEditorFactory {
    (options: EditorFactoryOptions): IEditorInstance;
}

export interface IEditor {
    // Get/Set the language
    language: Language;

    // Get/Set the URL of the code
    url?: string;

    // Get/Set the text
    value: string;

    /**
     * Register the onRun callback.
     */
    onRun(callback?: OnRunCallback): void;

    /**
     * Register the onStop callback.
     */
    onStop(callback?: OnStopCallback): void;

    /**
     * Register the onLanguageChanged callback.
     */
    onLanguageChanged(callback?: OnLanguageChangedCallback): void;

    /**
     * Resize the editor.
     */
    resize(): void;

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
    languages: {
        "font-weight": "bold",
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
    private _options: EditorOptions;
    // Last URL loaded
    private _url?: string;
    // Cached code by language
    private _cachedValue = new Map<Language, string | undefined>();
    private _ui: {
        element?: HTMLElement;
        base?: HTMLDivElement;
        toolbar?: HTMLDivElement;
        runButton?: HTMLInputElement;
        stopButton?: HTMLInputElement;
        languageSelect?: HTMLSelectElement;
        wrapper?: HTMLDivElement;
        editor?: IEditorInstance;
    } = {};

    constructor(
        factory: IEditorFactory,
        element: Element,
        options: EditorOptions
    ) {
        this._factory = factory;
        this._options = options;

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
            input.value = "Run";
            input.onclick = () => this._notifyRun();
            this._ui.runButton = input;
            this._ui.toolbar.appendChild(input);
        }

        {
            const input = createElement("input") as HTMLInputElement;
            input.type = "button";
            input.value = "Stop";
            input.onclick = () => this._notifyStop();
            this._ui.stopButton = input;
            this._ui.toolbar.appendChild(input);
        }

        {
            const div = createElement(
                "div",
                "moroboxai-languages"
            ) as HTMLDivElement;
            Object.assign(div.style, STYLES["languages"]);
            this._ui.toolbar!.appendChild(div);

            const select = createElement("select") as HTMLSelectElement;
            select.onchange = (ev) =>
                this._notifyLanguageChanged(select.value as Language);
            div.appendChild(select);
            this._ui.languageSelect = select;

            Object.values(LANGUAGE_OPTIONS).forEach((options) => {
                const child = createElement("option") as HTMLOptionElement;
                child.value = options.language;
                child.textContent = options.name;
                select.appendChild(child);
            });
        }

        {
            this._ui.editor = this._factory({
                element: this._ui.wrapper,
                language: this._options.language ?? DEFAULT_LANGUAGE
            });

            this._ui.languageSelect.value = this.language;

            this._update({
                language: this.language,
                url: this._options.url,
                value: this._options.value
            });
        }
    }

    private _notifyRun() {
        if (this._options.onRun) {
            this._options.onRun({
                language: this.language,
                script: this.value
            });
        }
    }

    private _notifyStop() {
        if (this._options.onStop) {
            this._options.onStop();
        }
    }

    private _notifyLanguageChanged(language: Language) {
        this.language = language;
        if (this._options.onLanguageChanged) {
            this._options.onLanguageChanged(language);
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
        this._update({
            language: value
        });
    }

    get url(): string | undefined {
        return this._url;
    }

    set url(value: string | URLFactory) {
        this._update({
            language: this.language,
            url: value
        });
    }

    get value(): string {
        if (this._ui.editor !== undefined) {
            return this._ui.editor.value;
        }

        return "";
    }

    set value(value: string | ValueFactory) {
        this._update({
            language: this.language,
            value
        });
    }

    /**
     * Update the language and or URL/value.
     * @param {object} options - options
     */
    private _update(options: {
        language?: Language;
        url?: string | URLFactory;
        value?: string | ValueFactory;
    }) {
        const forceValueUpdate =
            options.url !== undefined || options.value !== undefined;
        if (forceValueUpdate) {
            this._options.url = options.url;
            this._options.value = options.value;
        }

        const newLanguage = options.language ?? this.language;
        const newURL = this._options.url;
        const newValue = this._options.value;

        new Promise<string | undefined>((resolve, reject) => {
            if (!forceValueUpdate) {
                const cachedValue = this._cachedValue.get(newLanguage);
                if (cachedValue !== undefined) {
                    return resolve(cachedValue);
                }
            }

            // The URL changed
            if (newURL !== undefined) {
                // Read new URL from options
                let url: string | undefined = undefined;
                if (typeof newURL === "string") {
                    url = newURL;
                } else if (typeof newURL === "function") {
                    url = newURL(newLanguage);
                }

                if (url === undefined) {
                    return resolve(undefined);
                }

                // We allow to define a generic URL such as
                // https://.../agent.* where * is replaced by the
                // extension of selected language
                url = url.replace("*", LANGUAGE_OPTIONS[newLanguage].ext);

                return fetch(url)
                    .then((response) => response.text())
                    .then((value) => {
                        return resolve(value);
                    });
            }

            // Check in options
            let value: string | undefined = undefined;
            if (value === undefined && newValue !== undefined) {
                if (typeof newValue === "string") {
                    value = newValue;
                } else if (typeof newValue === "function") {
                    value = newValue(newLanguage);
                }
            }

            return resolve(value);
        }).then((value) => {
            const oldValue = this.value;
            if (oldValue !== undefined) {
                this._cachedValue.set(this.language, oldValue);
            }

            if (this._ui.editor !== undefined) {
                this._ui.editor.language = newLanguage;
                if (value !== undefined) {
                    this._ui.editor.value = value;
                }
            }
        });
    }

    onRun(callback?: OnRunCallback): void {
        this._options.onRun = callback;
    }

    onStop(callback?: OnStopCallback): void {
        this._options.onStop = callback;
    }

    onLanguageChanged(callback?: OnLanguageChangedCallback): void {
        this._options.onLanguageChanged = callback;
    }

    resize() {
        this._ui.editor?.resize();
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
export function defaultOptions(): EditorOptions {
    return {
        language: DEFAULT_LANGUAGE
    };
}

function isEditorOptions(
    _?: EditorOptions | Element | Element[] | HTMLCollectionOf<Element>
): _ is EditorOptions {
    return _ !== undefined && !isElementArray(_) && !("className" in _);
}

function isHTMLElement(_: Element | HTMLElement): _ is HTMLElement {
    return "dataset" in _;
}

function isElementArray(
    _: EditorOptions | Element | Element[] | HTMLCollectionOf<Element>
): _ is Element[] | HTMLCollectionOf<Element> {
    return "length" in _;
}

function createEditor(
    factory: IEditorFactory,
    element: Element,
    options: EditorOptions
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
        | EditorOptions
        | Element
        | Element[]
        | HTMLCollectionOf<Element>
        | undefined,
    options?: EditorOptions
): IEditor | IEditor[] {
    let _elements: undefined | Element | Element[] | HTMLCollectionOf<Element> =
        undefined;
    let _options: EditorOptions = defaultOptions();

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
