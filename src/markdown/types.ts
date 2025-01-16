import type { CodeOptionsMeta } from 'shiki';
import type { Element, ElementContent, Root } from 'hast';

export type ParseMetaFunction = (keyword?: string) => unknown;

type PreprocessFunction = (
    code: string, 
    meta: Required<CodeOptionsMeta>['meta'],
    params: any
) => string;

type TransformFunction = (
    node: Element | Root,
    meta: Required<CodeOptionsMeta>['meta'],
    params: any

) => Element | Root;

type CleanupFunction = (
    pre: Element
) => void;

type RegisterMeta = Map<string, ParseMetaFunction>;

export interface DevTransformer {

    // Use name so other transformers can reference its meta data
    name: string;

    // Input meta data to watch out for, and function to parse it
    register?: RegisterMeta;

    // Process any params, to be run after all input meta are parsed
    setup?: PreprocessFunction;

    /* Apply the transformer at one of the Shiki hooks:
       line, code, pre, root */
    transform?: TransformFunction;

    /* Make some style changes. */
    styleElements?: TransformFunction;

    // Delete used meta data from <pre> tag that should remain hidden
    cleanup?: CleanupFunction;
}

export interface CommentTransformerMeta {
    keyword: string;
    message: string;
    index: number;
}

export type CommentMap = Map<number, CommentTransformerMeta>;

export type HighlightedSegment = {
    startLine: number,
    endLine?: number,
    startChar?: number,
    endChar?: number,
    termStr?: string,
    termRegexp?: RegExp,
    startMatch?: number,
    endMatch?: number,
    dataId?: string
};

export type TraversalFunction = (
    node: ElementContent, 
    parent: Element | null,
    siblingIndex: number
) => boolean;