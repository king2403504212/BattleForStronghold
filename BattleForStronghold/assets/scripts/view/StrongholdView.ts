import { Button, Color, Graphics, Label, Layers, Node, Sprite, SpriteFrame, tween, Tween, UIOpacity, UITransform, Vec3 } from 'cc';
import { ArtSlots, colorFromHex, createSpriteNode, getWhiteSpriteFrame } from './ArtSlots';
import {
    FACTION_FONT_SIZE,
    FACTION_LABEL,
    FACTION_OFFSET_Y,
    FOCUS_DURATION,
    FOCUS_GLOW_ALPHA,
    FOCUS_GLOW_PADDING,
    FOCUS_SCALE,
    GameText,
    NAME_FONT_SIZE,
    NAME_OFFSET_Y,
    PRESS_DURATION,
    PRESS_SCALE,
    SOURCE_RING_ALPHA_HIGH,
    SOURCE_RING_ALPHA_LOW,
    SOURCE_RING_COLOR,
    SOURCE_RING_HALF_DURATION,
    STRONGHOLD_BODY_SIZE,
    STRONGHOLD_HIT_SIZE,
    TARGET_RING_COLOR,
    TROOP_FONT_SIZE,
    TROOP_OFFSET_Y,
} from '../config/GameConfig';
import { StrongholdState } from '../model/StrongholdState';
import { StrongholdId } from '../types/GameTypes';

/**
 * 一个据点的显示。只改节点，不改兵力和阵营规则。
 * 没挂这座城的图时色块用阵营色；挂上图后色块保持白色，阵营靠文字和色条区分。
 * 图片按据点 ID 固定，占领后不换图。
 */
export class StrongholdView {
    readonly root: Node;
    readonly id: StrongholdId;

    private readonly customFrame: SpriteFrame | null;
    private readonly body: Node;
    private readonly mark: Node;
    private readonly glow: Node;
    private readonly nameLabel: Label;
    private readonly factionLabel: Label;
    private readonly troopLabel: Label;
    private readonly sourceRing: Node;
    private readonly sourceOpacity: UIOpacity;
    private readonly targetRing: Node;
    private readonly onClick: (id: StrongholdId) => void;
    private sourceOn = false;
    private targetOn = false;
    private focused = false;

    constructor(parent: Node, state: StrongholdState, art: ArtSlots, onClick: (id: StrongholdId) => void) {
        this.id = state.id;
        this.customFrame = art.frameFor(state.id);
        this.onClick = onClick;
        this.root = new Node(`Stronghold_${state.id}`);
        this.root.layer = Layers.Enum.UI_2D;
        this.root.setParent(parent);
        const hit = this.root.addComponent(UITransform);
        hit.setAnchorPoint(0.5, 0.5);
        hit.setContentSize(STRONGHOLD_HIT_SIZE.width, STRONGHOLD_HIT_SIZE.height);
        this.root.setPosition(state.position.x, state.position.y, 0);

        const glowWidth = STRONGHOLD_BODY_SIZE.width + FOCUS_GLOW_PADDING * 2;
        const glowHeight = STRONGHOLD_BODY_SIZE.height + FOCUS_GLOW_PADDING * 2;
        this.glow = createSpriteNode('Glow', glowWidth, glowHeight, null, colorFromHex(state.color, FOCUS_GLOW_ALPHA));
        this.glow.setParent(this.root);
        this.glow.active = false;

        this.body = createSpriteNode(
            'Body',
            STRONGHOLD_BODY_SIZE.width,
            STRONGHOLD_BODY_SIZE.height,
            this.customFrame,
            colorFromHex(state.color),
        );
        this.body.setParent(this.root);

        this.mark = createSpriteNode('Mark', 24, 8, null, colorFromHex(state.color));
        this.mark.setParent(this.root);
        this.mark.setPosition(40, 40, 0);

        this.nameLabel = this.addLabel('Name', NAME_OFFSET_Y, NAME_FONT_SIZE);
        this.factionLabel = this.addLabel('Faction', FACTION_OFFSET_Y, FACTION_FONT_SIZE);
        this.troopLabel = this.addLabel('Troops', TROOP_OFFSET_Y, TROOP_FONT_SIZE);

        this.sourceRing = this.addRing('SourceRing', SOURCE_RING_COLOR);
        this.sourceOpacity = this.sourceRing.addComponent(UIOpacity);
        this.targetRing = this.addRing('TargetRing', TARGET_RING_COLOR);
        this.sourceRing.active = false;
        this.targetRing.active = false;

        const button = this.root.addComponent(Button);
        button.transition = Button.Transition.NONE;
        this.root.on(Button.EventType.CLICK, this.handleClick, this);
        this.render(state);
    }

    /** 刷新名称、阵营、兵力和颜色。不重置选中圈和焦点缩放。 */
    render(state: StrongholdState): void {
        this.root.setPosition(state.position.x, state.position.y, 0);
        this.nameLabel.string = state.name;
        this.factionLabel.string = FACTION_LABEL[state.faction];
        this.troopLabel.string = `${GameText.troopPrefix} ${state.troops}`;
        this.paintBody(state.color);
        this.paintSprite(this.mark, state.color, 255);
        this.paintSprite(this.glow, state.color, FOCUS_GLOW_ALPHA);
    }

    /** 空闲态点按反馈：缩到 0.94 再回到 1。 */
    playPress(): void {
        Tween.stopAllByTarget(this.root);
        this.root.setScale(1, 1, 1);
        tween(this.root)
            .to(PRESS_DURATION, { scale: new Vec3(PRESS_SCALE, PRESS_SCALE, 1) })
            .to(PRESS_DURATION, { scale: new Vec3(1, 1, 1) })
            .start();
    }

    /** 行军或交战中的焦点：保持 1.1，并显示阵营色光晕。 */
    setFocused(on: boolean): void {
        if (this.focused === on) {
            return;
        }
        this.focused = on;
        Tween.stopAllByTarget(this.root);
        this.glow.active = on;
        const scale = on ? FOCUS_SCALE : 1;
        tween(this.root)
            .to(FOCUS_DURATION, { scale: new Vec3(scale, scale, 1) })
            .start();
    }

    /** 来源圈。重复设置同一个状态时不重启动画。 */
    setSourceHighlight(on: boolean): void {
        if (this.sourceOn === on) {
            return;
        }
        this.sourceOn = on;
        Tween.stopAllByTarget(this.sourceOpacity);
        this.sourceRing.active = on;
        if (!on) {
            return;
        }
        this.sourceOpacity.opacity = SOURCE_RING_ALPHA_HIGH;
        tween(this.sourceOpacity)
            .to(SOURCE_RING_HALF_DURATION, { opacity: SOURCE_RING_ALPHA_LOW })
            .to(SOURCE_RING_HALF_DURATION, { opacity: SOURCE_RING_ALPHA_HIGH })
            .union()
            .repeatForever()
            .start();
    }

    /** 目标圈，静止显示。 */
    setTargetHighlight(on: boolean): void {
        if (this.targetOn === on) {
            return;
        }
        this.targetOn = on;
        this.targetRing.active = on;
    }

    /** 停掉动画和点击后再销毁节点。 */
    dispose(): void {
        Tween.stopAllByTarget(this.root);
        Tween.stopAllByTarget(this.sourceOpacity);
        this.root.off(Button.EventType.CLICK, this.handleClick, this);
        this.root.destroy();
    }

    private handleClick(): void {
        this.onClick(this.id);
    }

    private addLabel(name: string, offsetY: number, fontSize: number): Label {
        const node = new Node(name);
        node.layer = Layers.Enum.UI_2D;
        node.setParent(this.root);
        node.setPosition(0, offsetY, 0);
        const transform = node.addComponent(UITransform);
        transform.setContentSize(150, fontSize + 8);
        const label = node.addComponent(Label);
        label.useSystemFont = true;
        label.fontSize = fontSize;
        label.lineHeight = fontSize + 4;
        label.horizontalAlign = Label.HorizontalAlign.CENTER;
        label.verticalAlign = Label.VerticalAlign.CENTER;
        label.color = Color.WHITE;
        label.enableOutline = true;
        label.outlineColor = new Color(0, 0, 0, 180);
        label.outlineWidth = 2;
        return label;
    }

    private addRing(name: string, hex: string): Node {
        const node = new Node(name);
        node.layer = Layers.Enum.UI_2D;
        node.setParent(this.root);
        const transform = node.addComponent(UITransform);
        const width = STRONGHOLD_BODY_SIZE.width + 16;
        const height = STRONGHOLD_BODY_SIZE.height + 16;
        transform.setContentSize(width, height);
        const graphics = node.addComponent(Graphics);
        graphics.lineWidth = 4;
        graphics.strokeColor = colorFromHex(hex);
        graphics.roundRect(-width / 2, -height / 2, width, height, 8);
        graphics.stroke();
        return node;
    }

    /** 有正式据点图时保持白色，避免把图片乘暗。 */
    private paintBody(hex: string): void {
        const sprite = this.body.getComponent(Sprite);
        const transform = this.body.getComponent(UITransform);
        if (!sprite || !transform) {
            return;
        }
        if (this.customFrame) {
            sprite.spriteFrame = this.customFrame;
            sprite.color = Color.WHITE;
        } else {
            sprite.spriteFrame = getWhiteSpriteFrame();
            sprite.color = colorFromHex(hex);
        }
        sprite.sizeMode = Sprite.SizeMode.CUSTOM;
        transform.setContentSize(STRONGHOLD_BODY_SIZE.width, STRONGHOLD_BODY_SIZE.height);
    }

    private paintSprite(node: Node, hex: string, alpha: number): void {
        const sprite = node.getComponent(Sprite);
        if (sprite) {
            sprite.color = colorFromHex(hex, alpha);
        }
    }
}
