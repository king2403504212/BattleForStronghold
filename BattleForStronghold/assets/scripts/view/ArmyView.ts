import { Color, instantiate, Label, Layers, Node, Prefab, tween, Tween, UITransform, Vec3 } from 'cc';
import { FLOAT_DISTANCE, FLOAT_DURATION, MOVE_SPEED } from '../config/GameConfig';
import { Vec2 } from '../types/GameTypes';

const FILE_WIDTH = 2;

/**
 * 一支由多名 ggb 组成的队伍。
 * 士兵数量随剩余兵力变化，上方显示行军或交战和剩余兵力。
 */
export class ArmyView {
    readonly root: Node;

    private readonly prefab: Prefab;
    private readonly statusNode: Node;
    private readonly statusLabel: Label;
    private readonly soldiers: Node[] = [];
    private readonly alongGap: number;
    private readonly acrossGap: number;
    private readonly bodyHalfHeight: number;
    private readonly soldierScaleX: number;
    private readonly soldierScaleY: number;
    private troops = 0;
    private stateText = '';
    private march: Vec2 = { x: 1, y: 0 };
    private stopped = false;

    private constructor(parent: Node, prefab: Prefab, troops: number, position: Vec2) {
        this.prefab = prefab;
        const sample = instantiate(prefab);
        const size = sample.getComponent(UITransform)?.contentSize;
        const scale = sample.scale;
        sample.destroy();
        const bodyWidth = (size?.width ?? 58) * Math.abs(scale.x);
        const bodyHeight = (size?.height ?? 94) * Math.abs(scale.y);
        this.bodyHalfHeight = bodyHeight / 2;
        this.soldierScaleX = Math.abs(scale.x);
        this.soldierScaleY = scale.y;
        this.alongGap = Math.max(bodyWidth, bodyHeight) + 12;
        this.acrossGap = bodyWidth + 12;
        this.root = new Node('Army');
        this.root.layer = Layers.Enum.UI_2D;
        this.root.setParent(parent);
        this.root.setPosition(position.x, position.y, 0);
        this.root.addComponent(UITransform).setContentSize(120, 80);

        this.statusNode = new Node('Status');
        this.statusNode.layer = this.root.layer;
        this.statusNode.setParent(this.root);
        this.statusNode.setPosition(0, this.bodyHalfHeight + 28, 0);
        this.statusNode.addComponent(UITransform).setContentSize(160, 28);
        this.statusLabel = this.statusNode.addComponent(Label);
        this.statusLabel.useSystemFont = true;
        this.statusLabel.fontSize = 18;
        this.statusLabel.lineHeight = 22;
        this.statusLabel.horizontalAlign = Label.HorizontalAlign.CENTER;
        this.statusLabel.verticalAlign = Label.VerticalAlign.CENTER;
        this.statusLabel.color = Color.WHITE;
        this.statusLabel.enableOutline = true;
        this.statusLabel.outlineColor = new Color(0, 0, 0, 180);
        this.statusLabel.outlineWidth = 2;
        this.setTroops(troops);
    }

    /** 用属性检查器里绑定的 ggb 预制体组成队伍。 */
    static createFrom(prefab: Prefab, parent: Node, troops: number, position: Vec2): ArmyView {
        return new ArmyView(parent, prefab, troops, position);
    }

    /** 行军中或交战中。文案由调用方传入策划原句。 */
    setStateText(text: string): void {
        this.stateText = text;
        this.refreshStatus();
    }

    /** 更新剩余兵力，并按兵力增减士兵。 */
    setTroops(troops: number): void {
        this.troops = troops;
        this.syncSoldiers();
        this.refreshStatus();
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

    /** 销毁整支队伍。模板节点不会被销毁。 */
    dispose(): void {
        this.stop();
        this.root.destroy();
    }

    private syncSoldiers(): void {
        const need = this.soldierCount(this.troops);
        while (this.soldiers.length < need) {
            const copy = instantiate(this.prefab);
            copy.setParent(this.root, false);
            copy.active = true;
            this.soldiers.push(copy);
        }
        while (this.soldiers.length > need) {
            this.soldiers.pop()?.destroy();
        }
        this.layoutSoldiers();
    }

    /** 每 8 点兵力 1 个士兵，最少 1 个，最多 8 个。 */
    private soldierCount(troops: number): number {
        if (troops <= 0) {
            return 0;
        }
        return Math.min(8, Math.max(1, Math.ceil(troops / 8)));
    }

    /** 沿当前行军方向排成两列。向左时把预制体的横向缩放改为负值。 */
    private layoutSoldiers(): void {
        const count = this.soldiers.length;
        const length = Math.hypot(this.march.x, this.march.y) || 1;
        const forwardX = this.march.x / length;
        const forwardY = this.march.y / length;
        const sideX = -forwardY;
        const sideY = forwardX;
        let top = this.bodyHalfHeight;
        for (let index = 0; index < count; index += 1) {
            const depth = Math.floor(index / FILE_WIDTH);
            const slot = index % FILE_WIDTH;
            const width = Math.min(FILE_WIDTH, count - depth * FILE_WIDTH);
            const back = -depth * this.alongGap;
            const side = (slot - (width - 1) / 2) * this.acrossGap;
            const x = forwardX * back + sideX * side;
            const y = forwardY * back + sideY * side;
            const soldier = this.soldiers[index];
            const face = this.march.x < 0 ? -1 : 1;
            soldier.setScale(this.soldierScaleX * face, this.soldierScaleY, soldier.scale.z);
            soldier.setPosition(x, y, 0);
            top = Math.max(top, y + this.bodyHalfHeight);
        }
        this.statusNode.setPosition(0, top + 28, 0);
    }

    private refreshStatus(): void {
        this.statusLabel.string = this.stateText ? `${this.stateText} ${this.troops}` : String(this.troops);
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
        const parentScale = Math.abs(this.root.parent?.worldScale.x ?? 1);
        tween(this.root)
            .to(distance * parentScale / MOVE_SPEED, { position: new Vec3(to.x, to.y, 0) })
            .call(() => this.step(points, index + 1, onArrive))
            .start();
    }

    /** 按这一段路线的方向重新排队，并让士兵朝向行军方向。 */
    private face(from: Vec2, to: Vec2): void {
        this.march = { x: to.x - from.x, y: to.y - from.y };
        this.layoutSoldiers();
    }
}

/** 战斗飘字。场景没有模板，所以上移后销毁。 */
export function showDamageFloat(parent: Node, x: number, y: number, text: string): Node {
    const node = new Node('Float');
    node.layer = parent.layer;
    node.setParent(parent);
    node.setPosition(x, y, 0);
    const label = node.addComponent(Label);
    label.useSystemFont = true;
    label.string = text;
    label.fontSize = 24;
    label.lineHeight = 28;
    label.color = Color.WHITE;
    tween(node)
        .by(FLOAT_DURATION, { position: new Vec3(0, FLOAT_DISTANCE, 0) })
        .call(() => node.destroy())
        .start();
    return node;
}
