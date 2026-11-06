import { Color, Graphics, Label, Layers, Node, tween, Tween, UIOpacity, UITransform, Vec3 } from 'cc';
import { ArtSlots, colorFromHex, createSpriteNode } from './ArtSlots';
import { FLOAT_DISTANCE, FLOAT_DURATION, MOVE_SPEED } from '../config/GameConfig';
import { Vec2 } from '../types/GameTypes';

const SOLDIER_SIZE = { width: 56, height: 72 };
const PLACEHOLDER_COLOR = '#F2F2F2';

/**
 * 一支队伍的显示。图片来自士兵槽；没挂图时用浅色方块。
 * 移动使用分段 Tween，每段时长等于像素长度除以速度。
 */
export class ArmyView {
    readonly root: Node;

    private readonly body: Node;
    private readonly arrow: Node;
    private readonly countLabel: Label;
    private readonly stateLabel: Label;
    private stopped = false;

    constructor(parent: Node, art: ArtSlots, troops: number, position: Vec2) {
        this.root = new Node('Army');
        this.root.layer = Layers.Enum.UI_2D;
        this.root.setParent(parent);
        this.root.setPosition(position.x, position.y, 0);
        this.root.addComponent(UITransform).setContentSize(SOLDIER_SIZE.width, SOLDIER_SIZE.height);

        this.body = createSpriteNode('Soldier', SOLDIER_SIZE.width, SOLDIER_SIZE.height, art.soldierFrame, colorFromHex(PLACEHOLDER_COLOR));
        this.body.setParent(this.root);

        this.arrow = new Node('Arrow');
        this.arrow.layer = Layers.Enum.UI_2D;
        this.arrow.setParent(this.root);
        this.arrow.setPosition(40, 0, 0);
        this.arrow.addComponent(UITransform).setContentSize(20, 16);
        const graphics = this.arrow.addComponent(Graphics);
        graphics.fillColor = Color.WHITE;
        graphics.moveTo(10, 0);
        graphics.lineTo(-6, 6);
        graphics.lineTo(-6, -6);
        graphics.close();
        graphics.fill();

        this.countLabel = this.addLabel('Count', 52, 20);
        this.stateLabel = this.addLabel('State', -52, 18);
        this.setTroops(troops);
    }

    /** 头顶显示剩余兵力，只写数字。 */
    setTroops(troops: number): void {
        this.countLabel.string = String(troops);
    }

    /** 行军中或交战中。文案由调用方传入策划原句。 */
    setStateText(text: string): void {
        this.stateLabel.string = text;
    }

    /**
     * 沿路径点移动。最后一段结束时停在终点并回调。
     * 调用 stop 后不会再触发回调。
     */
    playRoute(points: readonly Vec2[], onArrive: () => void): void {
        this.stopped = false;
        Tween.stopAllByTarget(this.root);
        if (points.length === 0) {
            onArrive();
            return;
        }
        const first = points[0];
        this.root.setPosition(first.x, first.y, 0);
        this.step(points, 0, onArrive);
    }

    /** 重开或销毁前调用，停掉移动 Tween。 */
    stop(): void {
        this.stopped = true;
        Tween.stopAllByTarget(this.root);
    }

    dispose(): void {
        this.stop();
        this.root.destroy();
    }

    private step(points: readonly Vec2[], index: number, onArrive: () => void): void {
        if (this.stopped) {
            return;
        }
        if (index >= points.length - 1) {
            const last = points[points.length - 1];
            this.root.setPosition(last.x, last.y, 0);
            onArrive();
            return;
        }
        const from = points[index];
        const to = points[index + 1];
        this.face(from, to);
        const distance = Math.hypot(to.x - from.x, to.y - from.y);
        if (distance <= 0) {
            this.step(points, index + 1, onArrive);
            return;
        }
        tween(this.root)
            .to(distance / MOVE_SPEED, { position: new Vec3(to.x, to.y, 0) })
            .call(() => this.step(points, index + 1, onArrive))
            .start();
    }

    /** 下一点在右侧或同一竖线时朝右，否则朝左。箭头单独指向下一点。 */
    private face(from: Vec2, to: Vec2): void {
        const faceRight = to.x >= from.x;
        this.body.setScale(faceRight ? 1 : -1, 1, 1);
        this.arrow.angle = Math.atan2(to.y - from.y, to.x - from.x) * 180 / Math.PI;
    }

    private addLabel(name: string, offsetY: number, fontSize: number): Label {
        const node = new Node(name);
        node.layer = Layers.Enum.UI_2D;
        node.setParent(this.root);
        node.setPosition(0, offsetY, 0);
        const transform = node.addComponent(UITransform);
        transform.setContentSize(80, fontSize + 8);
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
}

/** 战斗飘字。上移后销毁，不使用 setTimeout。 */
export function showDamageFloat(parent: Node, x: number, y: number, text: string): void {
    const node = new Node('Float');
    node.layer = Layers.Enum.UI_2D;
    node.setParent(parent);
    node.setPosition(x, y, 0);
    const label = node.addComponent(Label);
    label.useSystemFont = true;
    label.string = text;
    label.fontSize = 24;
    label.lineHeight = 28;
    label.color = Color.WHITE;
    const opacity = node.addComponent(UIOpacity);
    tween(node).by(FLOAT_DURATION, { position: new Vec3(0, FLOAT_DISTANCE, 0) }).start();
    tween(opacity).to(FLOAT_DURATION, { opacity: 0 }).call(() => node.destroy()).start();
}
