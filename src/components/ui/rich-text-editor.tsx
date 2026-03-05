import { forwardRef, useEffect, useImperativeHandle } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import { TextStyle, FontSize as FontSizeExtension } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import Highlight from "@tiptap/extension-highlight";
import FontFamily from "@tiptap/extension-font-family";
import { Bold, Italic, Underline as UnderlineIcon, Strikethrough, Type, Highlighter } from "lucide-react";

import { Toggle } from "@/components/ui/toggle";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

const FONT_FAMILIES = ["Verdana", "Arial", "Times New Roman", "Georgia", "Tahoma", "Courier New"];
const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28, 32, 36];

export interface RichTextEditorHandle {
  insertText: (text: string) => void;
  focus: () => void;
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeightClassName?: string;
  className?: string;
}

export const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  ({ value, onChange, placeholder = "Start typing...", minHeightClassName = "min-h-[300px]", className }, ref) => {
    const editor = useEditor({
      extensions: [
        StarterKit,
        Underline,
        TextStyle,
        FontSizeExtension,
        Color,
        Highlight.configure({ multicolor: true }),
        FontFamily,
      ],
      content: value || "<p></p>",
      editorProps: {
        attributes: {
          class: cn(
            "prose prose-sm max-w-none dark:prose-invert p-4 focus:outline-none",
            minHeightClassName,
          ),
        },
      },
      onCreate: ({ editor: e }) => {
        // Set Word-like defaults for new input.
        e.chain().focus().setFontFamily("Verdana").setFontSize("10px").run();
      },
      onUpdate: ({ editor: e }) => {
        onChange(e.getHTML());
      },
      immediatelyRender: false,
    });

    useEffect(() => {
      if (!editor) return;
      const current = editor.getHTML();
      const next = value || "<p></p>";
      if (current !== next) {
        editor.commands.setContent(next, { emitUpdate: false });
      }
    }, [editor, value]);

    useImperativeHandle(
      ref,
      () => ({
        insertText: (text: string) => {
          if (!editor) return;
          editor.chain().focus().insertContent(text).run();
          onChange(editor.getHTML());
        },
        focus: () => {
          editor?.chain().focus().run();
        },
      }),
      [editor, onChange],
    );

    if (!editor) {
      return (
        <div className={cn("rounded-md border bg-background", className)}>
          <div className={cn("p-4 text-sm text-muted-foreground", minHeightClassName)}>Loading editor...</div>
        </div>
      );
    }

    const fontFamily = editor.getAttributes("textStyle").fontFamily || "Verdana";
    const fontSizeRaw = editor.getAttributes("textStyle").fontSize || "10px";
    const fontSize = String(fontSizeRaw).replace("px", "");
    const textColor = editor.getAttributes("textStyle").color || "#000000";
    const highlightColor = editor.getAttributes("highlight").color || "#fff59d";

    return (
      <div className={cn("rounded-md border bg-background overflow-hidden", className)}>
        <div className="flex flex-wrap items-center gap-2 border-b bg-muted/30 px-3 py-2">
          <Toggle
            size="sm"
            variant="outline"
            pressed={editor.isActive("bold")}
            onPressedChange={() => editor.chain().focus().toggleBold().run()}
            aria-label="Bold"
          >
            <Bold className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            variant="outline"
            pressed={editor.isActive("italic")}
            onPressedChange={() => editor.chain().focus().toggleItalic().run()}
            aria-label="Italic"
          >
            <Italic className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            variant="outline"
            pressed={editor.isActive("underline")}
            onPressedChange={() => editor.chain().focus().toggleUnderline().run()}
            aria-label="Underline"
          >
            <UnderlineIcon className="h-4 w-4" />
          </Toggle>
          <Toggle
            size="sm"
            variant="outline"
            pressed={editor.isActive("strike")}
            onPressedChange={() => editor.chain().focus().toggleStrike().run()}
            aria-label="Strikethrough"
          >
            <Strikethrough className="h-4 w-4" />
          </Toggle>

          <Select value={fontFamily} onValueChange={(family) => editor.chain().focus().setFontFamily(family).run()}>
            <SelectTrigger className="h-8 w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_FAMILIES.map((family) => (
                <SelectItem key={family} value={family}>
                  {family}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={fontSize} onValueChange={(size) => editor.chain().focus().setFontSize(`${size}px`).run()}>
            <SelectTrigger className="h-8 w-[90px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {FONT_SIZES.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 px-2" aria-label="Text color">
                <Type className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <input
                type="color"
                value={textColor}
                className="h-9 w-10 cursor-pointer rounded border bg-background p-1"
                onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
                aria-label="Choose text color"
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-8 px-2" aria-label="Highlight color">
                <Highlighter className="h-4 w-4" />
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-2">
              <input
                type="color"
                value={highlightColor}
                className="h-9 w-10 cursor-pointer rounded border bg-background p-1"
                onChange={(e) => editor.chain().focus().setHighlight({ color: e.target.value }).run()}
                aria-label="Choose highlight color"
              />
            </PopoverContent>
          </Popover>
        </div>

        <EditorContent editor={editor} />

        {editor.isEmpty && (
          <div className="pointer-events-none px-4 pb-4 text-sm text-muted-foreground/70">{placeholder}</div>
        )}
      </div>
    );
  },
);

RichTextEditor.displayName = "RichTextEditor";
