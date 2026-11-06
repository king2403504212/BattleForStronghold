import { _decorator, Color, Component, Node, Rect, Size, SpriteFrame, Texture2D } from 'cc';
import { StrongholdId } from '../types/GameTypes';

const { ccclass, property } = _decorator;

/** 旧的运行时拼图工具。画面已在 game.scene 里，新代码不要调用这里创建节点。 */

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

/** 禁止再调用。画面节点使用 game.scene 里已经摆好的节点。 */
export function createSpriteNode(name: string, width: number, height: number, frame: SpriteFrame | null, tint: Color): Node {
    void name;
    void width;
    void height;
    void frame;
    void tint;
    throw new Error('不要用代码创建画面节点，直接使用 game.scene 里的现有节点');
}

/** 禁止再调用。背景使用场景里的 Bg。 */
export function createBackground(parent: Node, art: ArtSlots): Node {
    void parent;
    void art;
    throw new Error('不要用代码创建背景，直接使用 game.scene 里的 Bg');
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
