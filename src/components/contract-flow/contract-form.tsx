"use client";

import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Plus, FileText, Building2, CircleDollarSign } from "lucide-react";
import { Contract, ContractType } from "@/lib/types";
import { useToast } from "@/hooks/use-toast";

interface ContractFormProps {
  onAdd: (contract: any) => void;
  existingContracts?: Contract[];
}

export function ContractForm({ onAdd, existingContracts = [] }: ContractFormProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    projectName: "",
    name: "",
    signingUnit: "",
    contractPrice: "", 
    type: "工程合同" as ContractType,
    fundingChannel: "",
    startDate: "",
    completionDate: "",
    endDate: "",
  });

  useEffect(() => {
    const name = formData.name.trim();
    if (!name) return;

    const engineeringKeywords = ["工程", "施工", "安装", "维修", "装修", "绿化", "监理", "设计", "勘察", "土建", "修缮", "改造"];
    const procurementKeywords = ["采购", "设备", "货物", "材料", "软件", "系统", "耗材", "办公", "桌", "椅", "显示器"];

    const isEngineering = engineeringKeywords.some(k => name.includes(k));
    const isProcurement = procurementKeywords.some(k => name.includes(k));

    if (isEngineering && !isProcurement) {
      setFormData(prev => ({ ...prev, type: "工程合同" }));
    } else if (isProcurement && !isEngineering) {
      setFormData(prev => ({ ...prev, type: "采购合同" }));
    }
  }, [formData.name]);

  const suggestions = useMemo(() => {
    const projects = new Set<string>();
    const names = new Set<string>();
    const units = new Set<string>();
    const channels = new Set<string>();

    existingContracts.forEach(c => {
      if (c.projectName) projects.add(c.projectName);
      if (c.name) names.add(c.name);
      if (c.signingUnit) units.add(c.signingUnit);
      if (c.fundingChannel) channels.add(c.fundingChannel);
    });

    return {
      projects: Array.from(projects).sort(),
      names: Array.from(names).sort(),
      units: Array.from(units).sort(),
      channels: Array.from(channels).sort(),
    };
  }, [existingContracts]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.projectName || !formData.name || !formData.fundingChannel) return;
    onAdd({ ...formData, contractPrice: parseFloat(formData.contractPrice) || 0, price: 0 });
    setFormData({ projectName: "", name: "", signingUnit: "", contractPrice: "", type: "工程合同", fundingChannel: "", startDate: "", completionDate: "", endDate: "" });
    setIsOpen(false);
    toast({ title: "合同记录录入成功" });
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="w-full h-16 font-black text-xl bg-primary hover:bg-primary/90 text-white shadow-xl shadow-primary/20 rounded-2xl flex items-center justify-center gap-3 transition-all active:scale-[0.98]">
          <Plus className="w-7 h-7" />
          新增合同记录录入
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] p-0 overflow-hidden rounded-3xl border-none shadow-2xl">
        <DialogHeader className="p-8 bg-slate-50 border-b">
          <div className="flex items-center gap-4">
            <div className="bg-primary p-2.5 rounded-xl shadow-sm"><FileText className="w-6 h-6 text-white" /></div>
            <div>
              <DialogTitle className="text-2xl font-black text-slate-800">录入新合同记录</DialogTitle>
              <DialogDescription className="font-bold text-slate-500 text-sm">快速同步合同财务金额与核心工期节点</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-8 max-h-[75vh] overflow-y-auto">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-slate-500 flex items-center gap-2"><Building2 className="w-3.5 h-3.5 text-blue-500" />所属项目名称</Label>
                <Input 
                  className="h-12 rounded-xl text-base font-bold" 
                  placeholder="例如：某某公寓项目" 
                  value={formData.projectName} 
                  onChange={e => setFormData({ ...formData, projectName: e.target.value })} 
                  list="project-names"
                  required 
                />
                <datalist id="project-names">
                  {suggestions.projects.map(p => <option key={p} value={p} />)}
                </datalist>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-slate-500">
                  合同细项名称 <span className="text-[10px] text-primary lowercase font-black ml-1">(智能分类中)</span>
                </Label>
                <Input 
                  className="h-12 rounded-xl text-base font-bold" 
                  placeholder="例如：电力工程施工" 
                  value={formData.name} 
                  onChange={e => setFormData({ ...formData, name: e.target.value })} 
                  list="contract-names"
                  required 
                />
                <datalist id="contract-names">
                  {suggestions.names.map(n => <option key={n} value={n} />)}
                </datalist>
              </div>
            </div>
            
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-slate-500">合作单位/签约单位</Label>
              <Input 
                className="h-12 rounded-xl text-base font-bold" 
                placeholder="请输入对方单位全称" 
                value={formData.signingUnit} 
                onChange={e => setFormData({ ...formData, signingUnit: e.target.value })} 
                list="unit-names"
              />
              <datalist id="unit-names">
                {suggestions.units.map(u => <option key={u} value={u} />)}
              </datalist>
            </div>

            <div className="grid grid-cols-2 gap-5">
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-slate-500">合同业务类别</Label>
                <Select value={formData.type} onValueChange={(val) => setFormData({ ...formData, type: val as ContractType })}>
                  <SelectTrigger className="h-12 rounded-xl font-bold text-base"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="工程合同" className="font-bold">工程合同 (施工类)</SelectItem>
                    <SelectItem value="采购合同" className="font-bold">采购合同 (货物类)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-black uppercase text-primary flex items-center gap-2"><CircleDollarSign className="w-3.5 h-3.5" />签约合同总额 (元)</Label>
                <Input type="number" className="h-12 rounded-xl border-primary/20 font-black text-base text-primary" placeholder="0.00" value={formData.contractPrice} onChange={e => setFormData({ ...formData, contractPrice: e.target.value })} />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-black uppercase text-slate-500">经费拨付渠道</Label>
              <Input 
                className="h-12 rounded-xl text-base font-bold" 
                placeholder="例如：上级专项拨款、单位自筹等" 
                value={formData.fundingChannel} 
                onChange={e => setFormData({ ...formData, fundingChannel: e.target.value })} 
                list="channel-names"
                required 
              />
              <datalist id="channel-names">
                {suggestions.channels.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>

            <div className="flex gap-4 pt-6">
              <Button type="button" variant="outline" className="flex-1 h-14 rounded-xl font-black text-base" onClick={() => setIsOpen(false)}>取消返回</Button>
              <Button type="submit" className="flex-[2] h-14 rounded-xl font-black text-lg bg-primary text-white shadow-xl shadow-primary/20">确认录入系统</Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
