import { _decorator, Component, macro, Node, Prefab, profiler, Tween, Vec3 } from 'cc';
import {
    ATTACKER_FLOAT_OFFSET,
    BATTLE_INTERVAL,
    DEFENDER_FLOAT_OFFSET,
    FACTION_LABEL,
    GameText,
} from '../config/GameConfig';
import { createSession, findStronghold, GameSession, getStatusText } from '../model/StrongholdState';
import { changeDispatchAmount, onStrongholdClick, tryDispatch } from '../rules/DispatchRules';
import { applyBattleTick, onArmyArrived } from '../rules/BattleRules';
import { GamePhase, StrongholdId, Vec2 } from '../types/GameTypes';
import { ArmyView, showDamageFloat } from '../view/ArmyView';
import { HudView } from '../view/HudView';
import { StrongholdView } from '../view/StrongholdView';

const { ccclass, property } = _decorator;

interface StrongholdLink {
    id: StrongholdId;
    bodyPath: string;
    infoPath: string;
}

const STRONGHOLD_LINKS: readonly StrongholdLink[] = [
    { id: 'player_base', bodyPath: 'home', infoPath: 'Info/HomeInfo' },
    { id: 'neutral_pass', bodyPath: 'Strongholds/gold', infoPath: 'Info/GoldInfo' },
    { id: 'silver_city', bodyPath: 'Strongholds/silver', infoPath: 'Info/SilverInfo' },
    { id: 'enemy_fort', bodyPath: 'Strongholds/dragon', infoPath: 'Info/DragonInfo' },
];

/**
 * 玩法总控。挂在 Canvas 上。
 * 只绑定 game.scene 里的现有节点，不重建背景、城、面板和提示。
 */
@ccclass('BattleController')
export class BattleController extends Component {
    /** 在属性检查器里拖入 ggb.prefab。士兵只从这份预制体生成。 */
    @property(Prefab)
    soldierPrefab: Prefab | null = null;

    private session: GameSession = createSession();
    private canvas: Node | null = null;
    private hud: HudView | null = null;
    private armyView: ArmyView | null = null;
    private readonly strongholdViews = new Map<StrongholdId, StrongholdView>();
    private readonly floatNodes: Node[] = [];
    private initialized = false;

    protected onEnable(): void {
        if (this.initialized) {
            return;
        }
        profiler.hideStats();
        this.canvas = this.node.name === 'Canvas' ? this.node : this.node.scene.getChildByName('Canvas');
        if (!this.canvas) {
            throw new Error('场景缺少 Canvas');
        }
        this.session = createSession();
        try {
            this.bindStrongholds();
            this.applySceneFacts();
            this.hud = new HudView(this.requirePath(this.canvas, 'Hud'), this.requirePath(this.canvas, 'Toast'), {
                onDispatchText: (text) => {
                    this.session.dispatchText = text;
                },
                onMinus: () => this.handleAmountChange(-1),
                onPlus: () => this.handleAmountChange(1),
                onDispatch: () => this.handleDispatch(),
                onRestart: () => this.handleRestart(),
            });
            this.renderAll();
        } catch (error) {
            this.releaseBindings();
            throw error;
        }
        this.initialized = true;
    }

    protected onDisable(): void {
        this.releaseBindings();
    }

    private bindStrongholds(): void {
        if (!this.canvas) {
            return;
        }
        for (const link of STRONGHOLD_LINKS) {
            const view = new StrongholdView(
                this.requirePath(this.canvas, link.bodyPath),
                this.requirePath(this.canvas, link.infoPath),
                link.id,
                (id) => this.handleStrongholdClick(id),
            );
            this.strongholdViews.set(link.id, view);
        }
    }

    /** 名称和坐标以场景节点为准，避免用配置里的旧坐标。 */
    private applySceneFacts(): void {
        if (!this.canvas) {
            return;
        }
        for (const state of this.session.strongholds) {
            const view = this.strongholdViews.get(state.id);
            if (!view) {
                continue;
            }
            state.name = view.currentName || state.name;
            state.position = this.pointIn(this.canvas, view.body);
        }
    }

    private handleStrongholdClick(id: StrongholdId): void {
        const view = this.strongholdViews.get(id);
        if (this.session.phase === GamePhase.Marching || this.session.phase === GamePhase.Battling) {
            const result = onStrongholdClick(this.session, id);
            this.showToast(result.toast);
            this.renderAll();
            return;
        }
        view?.playPress();
        const result = onStrongholdClick(this.session, id);
        this.showToast(result.toast);
        this.renderAll();
    }

    private handleAmountChange(delta: 1 | -1): void {
        const result = changeDispatchAmount(this.session, delta);
        this.showToast(result.toast);
        this.renderHud();
    }

    private handleDispatch(): void {
        const result = tryDispatch(this.session);
        if (!result.ok) {
            this.showToast(result.toast);
            return;
        }

        try {
            this.renderAll();
            this.createAndStartArmy();
        } finally {
            this.session.dispatchLock = false;
        }
    }

    private createAndStartArmy(): void {
        if (!this.canvas || !this.soldierPrefab || !this.session.army) {
            return;
        }
        const source = findStronghold(this.session, this.session.army.sourceId);
        const target = findStronghold(this.session, this.session.army.targetId);
        const sourceView = this.strongholdViews.get(this.session.army.sourceId);
        const targetView = this.strongholdViews.get(this.session.army.targetId);
        if (!source || !target || !sourceView || !targetView) {
            throw new Error('场景缺少出兵城或目标城');
        }

        const gate = this.findPath(this.canvas, 'ggb');
        const startNode = source.id === 'player_base' && gate ? gate : sourceView.body;
        const start = this.pointIn(this.canvas, startNode);
        const end = this.pointIn(this.canvas, targetView.body);
        this.armyView = ArmyView.createFrom(this.soldierPrefab, this.canvas, this.session.army.troops, start);
        this.armyView.setStateText(GameText.marching);
        this.armyView.playRoute([start, end], () => this.handleArmyArrived());
    }

    private handleArmyArrived(): void {
        const result = onArmyArrived(this.session);
        if (result.capturedImmediately) {
            this.disposeArmyView();
            this.showToast(result.toast);
            this.renderAll();
            return;
        }
        if (this.session.phase !== GamePhase.Battling) {
            return;
        }
        this.armyView?.setStateText(GameText.battling);
        this.renderAll();
        this.schedule(this.handleBattleTick, BATTLE_INTERVAL, macro.REPEAT_FOREVER, BATTLE_INTERVAL);
    }

    private handleBattleTick(): void {
        const army = this.session.army;
        if (!army || !this.canvas) {
            this.unschedule(this.handleBattleTick);
            return;
        }
        const target = findStronghold(this.session, army.targetId);
        if (!target) {
            this.unschedule(this.handleBattleTick);
            return;
        }

        const result = applyBattleTick(this.session);
        if (!result) {
            return;
        }
        if (result.defenderLoss > 0) {
            this.floatNodes.push(showDamageFloat(
                this.canvas,
                target.position.x + DEFENDER_FLOAT_OFFSET.x,
                target.position.y + DEFENDER_FLOAT_OFFSET.y,
                `-${result.defenderLoss}`,
            ));
        }
        if (result.attackerLoss > 0) {
            this.floatNodes.push(showDamageFloat(
                this.canvas,
                target.position.x + ATTACKER_FLOAT_OFFSET.x,
                target.position.y + ATTACKER_FLOAT_OFFSET.y,
                `-${result.attackerLoss}`,
            ));
        }

        if (result.outcome === 'ongoing') {
            this.armyView?.setTroops(this.session.army?.troops ?? 0);
            this.renderAll();
            return;
        }

        this.unschedule(this.handleBattleTick);
        this.disposeArmyView();
        this.showToast(result.toast);
        this.renderAll();
    }

    private handleRestart(): void {
        this.unschedule(this.handleBattleTick);
        this.disposeArmyView();
        this.clearDamageFloats();
        this.hud?.clearToast();
        for (const view of this.strongholdViews.values()) {
            view.resetVisual();
        }
        this.session = createSession();
        this.applySceneFacts();
        this.renderAll();
    }

    private renderAll(): void {
        for (const state of this.session.strongholds) {
            const view = this.strongholdViews.get(state.id);
            view?.render(state);
            view?.setSourceHighlight(this.session.sourceId === state.id);
            view?.setTargetHighlight(this.session.targetId === state.id);
            view?.setFocused(this.session.focusId === state.id);
        }
        this.renderHud();
    }

    private renderHud(): void {
        if (!this.hud) {
            return;
        }
        const source = this.session.sourceId ? findStronghold(this.session, this.session.sourceId) : null;
        const target = this.session.targetId ? findStronghold(this.session, this.session.targetId) : null;
        this.hud.setSourceText(source ? this.formatStronghold(source.name, source.faction) : GameText.unselected);
        this.hud.setTargetText(target ? this.formatStronghold(target.name, target.faction) : GameText.unselected);
        this.hud.setAvailableText(String(source?.troops ?? 0));
        this.hud.setDispatchText(this.session.dispatchText);
        this.hud.setStatusText(getStatusText(this.session));
    }

    private formatStronghold(name: string, faction: keyof typeof FACTION_LABEL): string {
        return `${name}（${FACTION_LABEL[faction]}）`;
    }

    private showToast(text: string | null): void {
        if (text) {
            this.hud?.showToast(text);
        }
    }

    private disposeArmyView(): void {
        this.armyView?.dispose();
        this.armyView = null;
    }

    private clearDamageFloats(): void {
        for (const node of this.floatNodes) {
            if (node.isValid) {
                Tween.stopAllByTarget(node);
                node.destroy();
            }
        }
        this.floatNodes.length = 0;
    }

    private releaseBindings(): void {
        this.unschedule(this.handleBattleTick);
        this.disposeArmyView();
        this.clearDamageFloats();
        for (const view of this.strongholdViews.values()) {
            view.dispose();
        }
        this.strongholdViews.clear();
        this.hud?.dispose();
        this.hud = null;
        this.canvas = null;
        this.initialized = false;
    }

    private pointIn(parent: Node, target: Node): Vec2 {
        const point = new Vec3();
        parent.inverseTransformPoint(point, target.worldPosition);
        return { x: point.x, y: point.y };
    }

    private findPath(root: Node, path: string): Node | null {
        let current: Node | null = root;
        for (const name of path.split('/')) {
            current = current?.getChildByName(name) ?? null;
        }
        return current;
    }

    private requirePath(root: Node, path: string): Node {
        const current = this.findPath(root, path);
        if (!current) {
            throw new Error(`场景缺少节点 ${path}`);
        }
        return current;
    }
}
