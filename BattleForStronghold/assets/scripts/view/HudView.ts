import { Button, Color, EditBox, Label, Node, tween, Tween, UITransform } from 'cc';
import { TOAST_DURATION } from '../config/GameConfig';
import { sanitizeDispatchText } from '../rules/DispatchRules';

/** 面板把操作交回总控，自己不改兵力和阶段。 */
export interface HudHandlers {
    onDispatchText: (text: string) => void;
    onMinus: () => void;
    onPlus: () => void;
    onDispatch: () => void;
    onRecruit: () => void;
    onRestart: () => void;
}

/**
 * 绑定场景里的 Hud 和 Toast。
 * 只改文字和点击，不创建面板。
 */
export class HudView {
    private readonly sourceValue: Label;
    private readonly targetValue: Label;
    private readonly availableValue: Label;
    private readonly grainValue: Label;
    private readonly statusValue: Label;
    private readonly editBox: EditBox;
    private readonly toastNode: Node;
    private readonly toastLabel: Label;
    private readonly handlers: HudHandlers;
    private syncing = false;

    constructor(hud: Node, toast: Node, handlers: HudHandlers) {
        this.handlers = handlers;
        this.sourceValue = this.requireLabel(hud, 'SourceValue');
        this.targetValue = this.requireLabel(hud, 'TargetValue');
        this.availableValue = this.requireLabel(hud, 'AvailableValue');
        this.grainValue = this.requireLabel(hud, 'GrainValue');
        this.statusValue = this.requireLabel(hud, 'Status');
        this.editBox = this.requireEditBox(hud, 'Input');
        this.toastNode = toast;
        this.toastLabel = this.requireNodeLabel(toast);
        this.bindButton(hud, 'Minus', this.onMinus);
        this.bindButton(hud, 'Plus', this.onPlus);
        this.bindButton(hud, 'Dispatch', this.onDispatch);
        this.bindButton(hud, 'Recruit', this.onRecruit);
        this.bindButton(hud, 'Restart', this.onRestart);
        this.editBox.node.on(EditBox.EventType.TEXT_CHANGED, this.onTextChanged, this);
        this.fitExistingLayout(hud);
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

    setGrainText(text: string): void {
        this.grainValue.string = text;
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
        Tween.stopAllByTarget(this.toastNode);
        this.toastNode.active = true;
        this.toastLabel.string = text;
        tween(this.toastNode)
            .delay(TOAST_DURATION)
            .call(() => {
                this.toastNode.active = false;
            })
            .start();
    }

    clearToast(): void {
        Tween.stopAllByTarget(this.toastNode);
        this.toastNode.active = false;
        this.toastLabel.string = '';
    }

    /** 解除事件。不销毁场景节点。 */
    dispose(): void {
        this.clearToast();
        this.editBox.node.off(EditBox.EventType.TEXT_CHANGED, this.onTextChanged, this);
        this.offButton(this.editBox.node.parent, 'Minus', this.onMinus);
        this.offButton(this.editBox.node.parent, 'Plus', this.onPlus);
        this.offButton(this.editBox.node.parent, 'Dispatch', this.onDispatch);
        this.offButton(this.editBox.node.parent, 'Recruit', this.onRecruit);
        this.offButton(this.editBox.node.parent, 'Restart', this.onRestart);
    }

    /** 现有节点挤在一起，文字又比框宽。只拉开间距并让数字明文显示。 */
    private fitExistingLayout(hud: Node): void {
        this.editBox.inputFlag = EditBox.InputFlag.DEFAULT;
        this.editBox.inputMode = EditBox.InputMode.NUMERIC;
        this.fitInputText(this.editBox.textLabel);
        this.fitInputText(this.editBox.placeholderLabel);
        const current = this.editBox.string;
        this.editBox.string = current;

        const rowY = -16;
        const grainY = 46;
        const plates = hud.children.filter((child) => child.name === 'Plate');
        this.placeLabel(this.requireChild(hud, 'SourceTitle'), -590, 52, rowY);
        this.placePair(plates[0], this.sourceValue.node, -480, 150, rowY);
        this.placeLabel(this.requireChild(hud, 'TargetTitle'), -360, 52, rowY);
        this.placePair(plates[1], this.targetValue.node, -250, 150, rowY);
        this.placeLabel(this.requireChild(hud, 'AvailableTitle'), -120, 120, rowY);
        this.placePair(plates[2], this.availableValue.node, 10, 100, rowY);
        this.requireChild(hud, 'Minus').setPosition(108, rowY, 0);
        this.editBox.node.setPosition(180, rowY, 0);
        this.requireChild(hud, 'Plus').setPosition(250, rowY, 0);
        this.requireChild(hud, 'Dispatch').setPosition(350, rowY, 0);
        this.requireChild(hud, 'Restart').setPosition(470, rowY, 0);
        this.placeLabel(this.statusValue.node, 590, 110, rowY);
        this.placeLabel(this.requireChild(hud, 'GrainTitle'), -560, 70, grainY);
        this.placePair(hud.children.find((child) => child.name === 'GrainPlate'), this.grainValue.node, -470, 90, grainY);
        this.requireChild(hud, 'Recruit').setPosition(-360, grainY, 0);
    }

    private placePair(plate: Node | undefined, value: Node, x: number, width: number, y = 0): void {
        if (plate) {
            plate.setPosition(x, y, 0);
            plate.getComponent(UITransform)?.setContentSize(width, 36);
        }
        this.placeLabel(value, x, width - 8, y);
    }

    private fitInputText(label: Label | null): void {
        if (!label) {
            return;
        }
        label.color = Color.WHITE;
        label.overflow = Label.Overflow.SHRINK;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.node.setPosition(0, 0, 0);
        label.node.getComponent(UITransform)?.setContentSize(88, 32);
    }

    private placeLabel(node: Node, x: number, width: number, y = 0): void {
        node.setPosition(x, y, 0);
        node.getComponent(UITransform)?.setContentSize(width, 32);
        const label = node.getComponent(Label);
        if (!label) {
            return;
        }
        label.overflow = Label.Overflow.SHRINK;
        label.enableWrapText = false;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
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

    private onRecruit(): void {
        this.handlers.onRecruit();
    }

    private onRestart(): void {
        this.handlers.onRestart();
    }

    private offButton(parent: Node | null, name: string, handler: () => void): void {
        parent?.getChildByName(name)?.off(Button.EventType.CLICK, handler, this);
    }

    private bindButton(parent: Node, name: string, handler: () => void): void {
        const node = this.requireChild(parent, name);
        const button = node.getComponent(Button);
        if (!button) {
            throw new Error(`${parent.name}/${name} 缺少 Button`);
        }
        node.on(Button.EventType.CLICK, handler, this);
    }

    private requireEditBox(parent: Node, name: string): EditBox {
        const editBox = this.requireChild(parent, name).getComponent(EditBox);
        if (!editBox) {
            throw new Error(`${parent.name}/${name} 缺少 EditBox`);
        }
        return editBox;
    }

    private requireLabel(parent: Node, name: string): Label {
        const label = this.requireChild(parent, name).getComponent(Label);
        if (!label) {
            throw new Error(`${parent.name}/${name} 缺少 Label`);
        }
        return label;
    }

    private requireNodeLabel(node: Node): Label {
        const label = node.getComponent(Label);
        if (!label) {
            throw new Error(`${node.name} 缺少 Label`);
        }
        return label;
    }

    private requireChild(parent: Node, name: string): Node {
        const child = parent.getChildByName(name);
        if (!child) {
            throw new Error(`${parent.name} 缺少 ${name}`);
        }
        return child;
    }
}
