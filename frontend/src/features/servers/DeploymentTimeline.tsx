import React from 'react';
import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { ServerStatus } from '@shared/types';

interface Props {
    status: ServerStatus;
    installing?: boolean;
}

export const DeploymentTimeline: React.FC<Props> = ({ status, installing }) => {
    const steps = [
        { id: 'created', label: 'Initialized', done: true },
        { id: 'deployed', label: 'Deployed', done: status !== 'INSTALLING' && !installing },
        { id: 'started', label: 'Running', done: status === 'ONLINE' }
    ];

    return (
        <div className="flex items-center gap-4 py-2 px-4 bg-secondary/30 rounded-full border border-border/50">
            {steps.map((step, i) => (
                <React.Fragment key={step.id}>
                    <div className="flex items-center gap-2">
                        {step.done ? (
                            <CheckCircle2 size={14} className="text-emerald-500" />
                        ) : i === 1 && (status === 'INSTALLING' || installing) ? (
                            <Loader2 size={14} className="text-primary animate-spin" />
                        ) : (
                            <Circle size={14} className="text-muted-foreground" />
                        )}
                        <span className={`text-[10px] font-bold uppercase tracking-widest ${step.done ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {step.label}
                        </span>
                    </div>
                    {i < steps.length - 1 && (
                        <div className={`h-[1px] w-4 ${steps[i+1].done ? 'bg-emerald-500/50' : 'bg-border'}`} />
                    )}
                </React.Fragment>
            ))}
        </div>
    );
};
