import { Button, Color, EditBox, Label, Layers, Node, tween, Tween, UIOpacity, UITransform } from 'cc';
import { colorFromHex, createSpriteNode, getWhiteSpriteFrame } from './ArtSlots';
import {
    DISPATCH_INPUT_MAX_LENGTH,
    GameText,
    PANEL_BG_ALPHA,
    PANEL_BG_COLOR,
    PANEL_POSITION,
    PANEL_SIZE,
    RESTART_BUTTON_COLOR,
    TOAST_DURATION,
} from '../config/GameConfig';
import { sanitizeDispatchText } from '../rules/DispatchRules';

const DISPATCH_BUTTON_COLOR = '#2F9E44';
const CAPTION_COLOR = '#C5D0DC';

/** 面板把操作交回总控，自己不改兵力和阶段。 */
export interface HudHandlers {
    onDispatchText: (text: string) => void;
    onMinus: () => void;
    onPlus: () => void;
    onDispatch: () => void;
    onRestart: () => void;
}

/**
 * 右侧操作栏和顶部提示。
 * 按钮文字使用策划原句。提示出现后 1.5 秒隐藏，新提示会替换旧提示。
 */
export class HudView {
    readonly root: Node;

    private readonly sourceValue: Label;
    private readonly targetValue: Label;
    private readonly availableValue: Label;
    private readonly statusValue: Label;
    private readonly editBox: EditBox;
    private readonly toastNode: Node;
    private readonly toastLabel: Label;
    private readonly toastOpacity: UIOpacity;
    private readonly handlers: HudHandlers;
    private syncing = false;

    constructor(parent: Node, handlers: HudHandlers) {
        this.handlers = handlers;
        this.root = new Node('Hud');
        this.root.layer = Layers.Enum.UI_2D;
        this.root.setParent(parent);

        const panel = createSpriteNode(
            'Panel',
            PANEL_SIZE.width,
            PANEL_SIZE.height,
            null,
            colorFromHex(PANEL_BG_COLOR, Math.round(PANEL_BG_ALPHA * 255)),
        );
        panel.setParent(this.root);
        panel.setPosition(PANEL_POSITION.x, PANEL_POSITION.y, 0);

        this.addCaption(panel, '标题', 290, 28, GameText.title, Color.WHITE);
        this.addCaption(panel, '来源标题', 230, 18, '来源', colorFromHex(CAPTION_COLOR));
        this.sourceValue = this.addCaption(panel, '来源', 196, 22, GameText.unselected, Color.WHITE);
        this.addCaption(panel, '目标标题', 140, 18, '目标', colorFromHex(CAPTION_COLOR));
        this.targetValue = this.addCaption(panel, '目标', 106, 22, GameText.unselected, Color.WHITE);
        this.addCaption(panel, '兵力标题', 50, 18, '可派遣兵力', colorFromHex(CAPTION_COLOR));
        this.availableValue = this.addCaption(panel, '兵力', 16, 22, '0', Color.WHITE);

        this.addTextButton(panel, 'Minus', -100, -24, 48, 48, '-', colorFromHex('#3D4F66'), this.onMinus);
        this.editBox = this.addEditBox(panel, 0, -24);
        this.addTextButton(panel, 'Plus', 100, -24, 48, 48, '+', colorFromHex('#3D4F66'), this.onPlus);
        this.addTextButton(panel, 'Dispatch', 0, -100, 260, 52, '派遣', colorFromHex(DISPATCH_BUTTON_COLOR), this.onDispatch);
        this.addTextButton(panel, 'Restart', 0, -170, 260, 48, '重新开始', colorFromHex(RESTART_BUTTON_COLOR), this.onRestart);
        this.statusValue = this.addCaption(panel, '状态', -240, 20, '', Color.WHITE);

        this.toastNode = createSpriteNode('Toast', 420, 48, null, new Color(0, 0, 0, 180));
        this.toastNode.setParent(this.root);
        this.toastNode.setPosition(0, 300, 0);
        this.toastOpacity = this.toastNode.addComponent(UIOpacity);
        this.toastLabel = this.addCaption(this.toastNode, '提示文字', 0, 22, '', Color.WHITE);
        this.toastNode.active = false;

        this.editBox.node.on(EditBox.EventType.TEXT_CHANGED, this.onTextChanged, this);
    }

    setSourceText(text: string): void {
        this.sourceValue.string = text;
    }

    setTargetText(text: string): void {
        this.targetValue.string = text;
    }

    setAvailableText(text: string): void {
        this.availableValue.string = text;
    }

    setStatusText(text: string): void {
        this.statusValue.string = text;
    }

    /** 从外部写回输入框。内容没变时不触发文本回调。 */
    setDispatchText(text: string): void {
        if (this.editBox.string === text) {
            return;
        }
        this.syncing = true;
        this.editBox.string = text;
        this.syncing = false;
    }

    /** 新提示替换当前提示，并重新计算 1.5 秒。 */
    showToast(text: string): void {
        Tween.stopAllByTarget(this.toastOpacity);
        this.toastNode.active = true;
        this.toastLabel.string = text;
        this.toastOpacity.opacity = 255;
        tween(this.toastOpacity)
            .delay(TOAST_DURATION)
            .call(() => {
                this.toastNode.active = false;
            })
            .start();
    }

    clearToast(): void {
        Tween.stopAllByTarget(this.toastOpacity);
        this.toastNode.active = false;
        this.toastLabel.string = '';
    }

    dispose(): void {
        this.clearToast();
        this.editBox.node.off(EditBox.EventType.TEXT_CHANGED, this.onTextChanged, this);
        this.root.destroy();
    }

    private onTextChanged(): void {
        if (this.syncing) {
            return;
        }
        const clean = sanitizeDispatchText(this.editBox.string);
        if (clean !== this.editBox.string) {
            this.syncing = true;
            this.editBox.string = clean;
            this.syncing = false;
        }
        this.handlers.onDispatchText(clean);
    }

    private onMinus(): void {
        this.handlers.onMinus();
    }

    private onPlus(): void {
        this.handlers.onPlus();
    }

    private onDispatch(): void {
        this.handlers.onDispatch();
    }

    private onRestart(): void {
        this.handlers.onRestart();
    }

    private addCaption(parent: Node, name: string, y: number, fontSize: number, text: string, color: Color): Label {
        const node = new Node(name);
        node.layer = Layers.Enum.UI_2D;
        node.setParent(parent);
        node.setPosition(0, y, 0);
        const transform = node.addComponent(UITransform);
        transform.setContentSize(280, fontSize + 10);
        const label = node.addComponent(Label);
        label.useSystemFont = true;
        label.string = text;
        label.fontSize = fontSize;
        label.lineHeight = fontSize + 6;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.color = color;
        return label;
    }

    private addTextButton(
        parent: Node,
        name: string,
        x: number,
        y: number,
        width: number,
        height: number,
        text: string,
        color: Color,
        handler: () => void,
    ): void {
        const node = createSpriteNode(name, width, height, null, color);
        node.setParent(parent);
        node.setPosition(x, y, 0);
        const button = node.addComponent(Button);
        button.transition = Button.Transition.NONE;
        node.on(Button.EventType.CLICK, handler, this);
        this.addCaption(node, '文字', 0, 22, text, Color.WHITE);
    }

    private addEditBox(parent: Node, x: number, y: number): EditBox {
        const node = createSpriteNode('Input', 120, 48, null, Color.WHITE);
        node.setParent(parent);
        node.setPosition(x, y, 0);
        const editBox = node.addComponent(EditBox);
        editBox.backgroundImage = getWhiteSpriteFrame();
        editBox.inputMode = EditBox.InputMode.NUMERIC;
        editBox.maxLength = DISPATCH_INPUT_MAX_LENGTH;
        editBox.string = '';
        editBox.fontSize = 22;
        editBox.fontColor = new Color(20, 24, 28, 255);
        editBox.placeholder = '';
        return editBox;
    }
}
