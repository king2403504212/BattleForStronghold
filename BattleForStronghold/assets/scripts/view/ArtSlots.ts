import { _decorator, Color, Component, Layers, Node, Rect, Size, Sprite, SpriteFrame, Texture2D, UITransform } from 'cc';
import { BG_COLOR } from '../config/GameConfig';
import { StrongholdId } from '../types/GameTypes';

const { ccclass, property } = _decorator;

let whiteSpriteFrame: SpriteFrame | null = null;

/** 1×1 白图。没挂正式图片时，Sprite 用它占位。 */
export function getWhiteSpriteFrame(): SpriteFrame {
    if (whiteSpriteFrame) {
        return whiteSpriteFrame;
    }
    const texture = new Texture2D();
    texture.reset({
        width: 1,
        height: 1,
        format: Texture2D.PixelFormat.RGBA8888,
    });
    texture.uploadData(new Uint8Array([255, 255, 255, 255]));
    const frame = new SpriteFrame();
    frame.reset({
        originalSize: new Size(1, 1),
        rect: new Rect(0, 0, 1, 1),
        texture,
    });
    frame.packable = false;
    whiteSpriteFrame = frame;
    return frame;
}

/** 把 #RRGGBB 转成颜色。alpha 取值 0–255。 */
export function colorFromHex(hex: string, alpha = 255): Color {
    const value = hex.replace('#', '');
    return new Color(
        parseInt(value.slice(0, 2), 16),
        parseInt(value.slice(2, 4), 16),
        parseInt(value.slice(4, 6), 16),
        alpha,
    );
}

/** 创建一个指定尺寸的 Sprite。有正式图时不再乘色。 */
export function createSpriteNode(name: string, width: number, height: number, frame: SpriteFrame | null, tint: Color): Node {
    const node = new Node(name);
    node.layer = Layers.Enum.UI_2D;
    const transform = node.addComponent(UITransform);
    transform.setAnchorPoint(0.5, 0.5);
    transform.setContentSize(width, height);
    const sprite = node.addComponent(Sprite);
    sprite.sizeMode = Sprite.SizeMode.CUSTOM;
    sprite.spriteFrame = frame ?? getWhiteSpriteFrame();
    sprite.color = frame ? Color.WHITE : tint;
    transform.setContentSize(width, height);
    return node;
}

/** 铺在画布中心的背景。没挂图时用背景色，挂图后显示原图。 */
export function createBackground(parent: Node, art: ArtSlots): Node {
    const node = createSpriteNode('Background', 1280, 720, art.bgFrame, colorFromHex(BG_COLOR));
    node.setParent(parent);
    node.setPosition(0, 0, 0);
    return node;
}

/**
 * 挂在 Game 节点上的图片槽。
 * 背景、三座城关和士兵都先空着，之后在编辑器里把图片拖到属性上。
 * 城关图按据点固定，占领后不换图。
 */
@ccclass('ArtSlots')
export class ArtSlots extends Component {
    @property(SpriteFrame)
    bgFrame: SpriteFrame | null = null;

    @property({ type: SpriteFrame, displayName: '青石城' })
    qingshiFrame: SpriteFrame | null = null;

    @property({ type: SpriteFrame, displayName: '金顶关' })
    jindingFrame: SpriteFrame | null = null;

    @property({ type: SpriteFrame, displayName: '赤焰堡' })
    chiyanFrame: SpriteFrame | null = null;

    @property(SpriteFrame)
    soldierFrame: SpriteFrame | null = null;

    /** 按据点取城关图。没挂图时返回 null，显示端再用阵营色占位。 */
    frameFor(id: StrongholdId): SpriteFrame | null {
        if (id === 'player_base') {
            return this.qingshiFrame;
        }
        if (id === 'neutral_pass') {
            return this.jindingFrame;
        }
        return this.chiyanFrame;
    }
}
