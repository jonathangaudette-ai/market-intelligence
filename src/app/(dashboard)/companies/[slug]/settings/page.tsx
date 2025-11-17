"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Building2,
  Users,
  Bell,
  Key,
  Globe,
  Mail,
  Shield,
  Trash2,
  Check,
  X,
  Zap,
  Clock,
  DollarSign,
  Star,
  Loader2,
} from "lucide-react";
import { AI_MODELS, AI_MODEL_METADATA, type AIModelId } from "@/types/company";

type Tab = "general" | "team" | "integrations" | "notifications" | "security" | "prompts";

export default function SettingsPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const [activeTab, setActiveTab] = useState<Tab>("general");

  // AI Model settings state
  const [aiModel, setAiModel] = useState<AIModelId>(AI_MODELS.SONNET_4_5);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // Load current settings
  useEffect(() => {
    async function loadSettings() {
      try {
        setIsLoadingSettings(true);
        const response = await fetch(`/api/companies/${slug}/settings`);
        if (response.ok) {
          const data = await response.json();
          if (data.settings?.aiModel) {
            setAiModel(data.settings.aiModel);
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error);
      } finally {
        setIsLoadingSettings(false);
      }
    }

    if (slug) {
      loadSettings();
    }
  }, [slug]);

  // Save AI model settings
  const handleSaveAIModel = async () => {
    try {
      setIsSavingSettings(true);
      setSettingsError(null);
      setSettingsSuccess(false);

      const response = await fetch(`/api/companies/${slug}/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ aiModel }),
      });

      if (response.ok) {
        setSettingsSuccess(true);
        setTimeout(() => setSettingsSuccess(false), 3000);
      } else {
        const error = await response.json();
        setSettingsError(error.error || 'Échec de la sauvegarde');
      }
    } catch (error) {
      setSettingsError('Échec de la sauvegarde des paramètres');
    } finally {
      setIsSavingSettings(false);
    }
  };

  const tabs = [
    { id: "general" as Tab, label: "Général", icon: Building2 },
    { id: "team" as Tab, label: "Équipe", icon: Users },
    { id: "integrations" as Tab, label: "Intégrations", icon: Globe },
    { id: "notifications" as Tab, label: "Notifications", icon: Bell },
    { id: "security" as Tab, label: "Sécurité", icon: Shield },
    { id: "prompts" as Tab, label: "Prompts IA", icon: Zap },
  ];

  const teamMembers = [
    {
      id: "1",
      name: "Admin User",
      email: "admin@example.com",
      role: "Admin",
      status: "active",
      avatar: "AD",
    },
    {
      id: "2",
      name: "John Doe",
      email: "john@example.com",
      role: "Editor",
      status: "active",
      avatar: "JD",
    },
    {
      id: "3",
      name: "Jane Smith",
      email: "jane@example.com",
      role: "Viewer",
      status: "pending",
      avatar: "JS",
    },
  ];

  const integrations = [
    {
      id: "1",
      name: "Slack",
      description: "Recevez des notifications dans Slack",
      status: "connected",
      icon: "💬",
    },
    {
      id: "2",
      name: "HubSpot",
      description: "Synchronisez vos données CRM",
      status: "not_connected",
      icon: "📊",
    },
    {
      id: "3",
      name: "Salesforce",
      description: "Intégration avec Salesforce",
      status: "not_connected",
      icon: "☁️",
    },
    {
      id: "4",
      name: "LinkedIn",
      description: "Collecte automatique de données",
      status: "connected",
      icon: "💼",
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b bg-card sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4">
          <div className="h-16 flex items-center">
            <div>
              <h1 className="text-2xl font-bold">Paramètres</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Gérez les paramètres de votre compagnie et de votre compte
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Tabs Sidebar */}
          <div className="lg:col-span-1">
            <Card>
              <CardContent className="p-4">
                <nav className="space-y-1">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => {
                          if (tab.id === "prompts") {
                            router.push(`/companies/${slug}/settings/prompts`);
                          } else {
                            setActiveTab(tab.id);
                          }
                        }}
                        className={`
                          w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                          ${
                            activeTab === tab.id
                              ? "bg-teal-50 text-teal-700 dark:bg-teal-900"
                              : "hover:bg-muted"
                          }
                        `}
                      >
                        <Icon className="h-4 w-4" />
                        {tab.label}
                      </button>
                    );
                  })}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Content Area */}
          <div className="lg:col-span-3 space-y-6">
            {/* General Settings */}
            {activeTab === "general" && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Informations de la compagnie</CardTitle>
                    <CardDescription>
                      Gérez les informations de base de votre organisation
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Nom de la compagnie
                      </label>
                      <Input placeholder="Demo Company" defaultValue="Demo Company" />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Site web
                      </label>
                      <Input
                        type="url"
                        placeholder="https://example.com"
                        defaultValue="https://democompany.com"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Description
                      </label>
                      <Textarea
                        placeholder="Décrivez votre entreprise..."
                        rows={4}
                        defaultValue="Plateforme d'intelligence concurrentielle alimentée par l'IA"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-2 block">
                        Industrie
                      </label>
                      <Input placeholder="SaaS, Technology, etc." defaultValue="SaaS" />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                      <Button variant="outline">Annuler</Button>
                      <Button>Enregistrer les modifications</Button>
                    </div>
                  </CardContent>
                </Card>

                {/* AI Configuration Card */}
                <Card>
                  <CardHeader>
                    <CardTitle>Configuration IA</CardTitle>
                    <CardDescription>
                      Sélectionnez le modèle d'IA pour la génération de réponses RFP
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {isLoadingSettings ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-teal-600" />
                      </div>
                    ) : (
                      <>
                        <div className="space-y-4">
                          {Object.values(AI_MODELS).map((modelId) => {
                            const metadata = AI_MODEL_METADATA[modelId];
                            const isSelected = aiModel === modelId;

                            return (
                              <div
                                key={modelId}
                                onClick={() => setAiModel(modelId)}
                                className={`
                                  relative p-4 border-2 rounded-lg cursor-pointer transition-all
                                  ${
                                    isSelected
                                      ? 'border-teal-500 bg-teal-50'
                                      : 'border-gray-200 hover:border-teal-300'
                                  }
                                `}
                              >
                                {isSelected && (
                                  <div className="absolute top-3 right-3">
                                    <div className="bg-teal-600 text-white rounded-full p-1">
                                      <Check className="h-3 w-3" />
                                    </div>
                                  </div>
                                )}
                                <div className="space-y-3">
                                  <div>
                                    <h4 className="text-sm font-semibold text-gray-900">
                                      {metadata.name}
                                    </h4>
                                    <p className="text-xs text-gray-600 mt-1">
                                      {metadata.description}
                                    </p>
                                  </div>
                                  <div className="flex gap-3">
                                    <div className="flex items-center gap-1.5">
                                      <Clock className="h-3.5 w-3.5 text-gray-500" />
                                      <span className="text-xs text-gray-600">
                                        {metadata.speed === 'fast' ? 'Rapide' : 'Équilibré'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <DollarSign className="h-3.5 w-3.5 text-gray-500" />
                                      <span className="text-xs text-gray-600">
                                        Coût {metadata.cost === 'low' ? 'faible' : 'moyen'}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                      <Star className="h-3.5 w-3.5 text-gray-500" />
                                      <span className="text-xs text-gray-600">
                                        Qualité {metadata.quality === 'good' ? 'bonne' : 'excellente'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Status messages */}
                        {settingsError && (
                          <div className="bg-red-50 border border-red-200 rounded-md p-3">
                            <p className="text-sm text-red-700">{settingsError}</p>
                          </div>
                        )}

                        {settingsSuccess && (
                          <div className="bg-green-50 border border-green-200 rounded-md p-3">
                            <p className="text-sm text-green-700 flex items-center gap-2">
                              <Check className="h-4 w-4" />
                              Paramètres enregistrés avec succès
                            </p>
                          </div>
                        )}

                        {/* Save button */}
                        <div className="flex justify-end pt-2">
                          <Button
                            onClick={handleSaveAIModel}
                            disabled={isSavingSettings}
                            className="gap-2"
                          >
                            {isSavingSettings ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Enregistrement...
                              </>
                            ) : (
                              <>
                                <Zap className="h-4 w-4" />
                                Enregistrer
                              </>
                            )}
                          </Button>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-red-600">Zone dangereuse</CardTitle>
                    <CardDescription>
                      Actions irréversibles sur votre compte
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between p-4 border border-red-200 rounded-lg bg-red-50">
                      <div>
                        <p className="text-sm font-medium text-red-900">
                          Supprimer la compagnie
                        </p>
                        <p className="text-xs text-red-700 mt-1">
                          Cela supprimera définitivement toutes vos données
                        </p>
                      </div>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Supprimer
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Team Settings */}
            {activeTab === "team" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Membres de l'équipe</CardTitle>
                      <CardDescription>
                        Gérez les accès et permissions de votre équipe
                      </CardDescription>
                    </div>
                    <Button className="gap-2">
                      <Mail className="h-4 w-4" />
                      Inviter un membre
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {teamMembers.map((member) => (
                      <div
                        key={member.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-teal-100 dark:bg-teal-900 rounded-full flex items-center justify-center">
                            <span className="text-sm font-medium text-teal-700 dark:text-teal-400">
                              {member.avatar}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium">{member.name}</p>
                            <p className="text-xs text-muted-foreground">{member.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge
                            variant={member.status === "active" ? "success" : "warning"}
                          >
                            {member.status === "active" ? "Actif" : "En attente"}
                          </Badge>
                          <select className="text-sm border border-gray-300 rounded-md px-2 py-1">
                            <option value="admin">Admin</option>
                            <option value="editor">Editor</option>
                            <option value="viewer">Viewer</option>
                          </select>
                          <Button variant="ghost" size="sm">
                            <X className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Integrations */}
            {activeTab === "integrations" && (
              <Card>
                <CardHeader>
                  <CardTitle>Intégrations</CardTitle>
                  <CardDescription>
                    Connectez vos outils préférés à votre plateforme
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {integrations.map((integration) => (
                      <div
                        key={integration.id}
                        className="p-4 border border-gray-200 rounded-lg hover:border-teal-300 transition-colors"
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className="text-2xl">{integration.icon}</div>
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900">
                                {integration.name}
                              </h4>
                              <p className="text-xs text-gray-600">
                                {integration.description}
                              </p>
                            </div>
                          </div>
                        </div>
                        {integration.status === "connected" ? (
                          <div className="flex items-center justify-between">
                            <Badge variant="success" className="gap-1">
                              <Check className="h-3 w-3" />
                              Connecté
                            </Badge>
                            <Button variant="outline" size="sm">
                              Déconnecter
                            </Button>
                          </div>
                        ) : (
                          <Button size="sm" className="w-full">
                            Connecter
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notifications */}
            {activeTab === "notifications" && (
              <Card>
                <CardHeader>
                  <CardTitle>Préférences de notification</CardTitle>
                  <CardDescription>
                    Choisissez comment vous souhaitez être notifié
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {[
                    {
                      title: "Nouveaux documents",
                      description: "Quand un document est ajouté et analysé",
                    },
                    {
                      title: "Signaux détectés",
                      description: "Quand un signal important est détecté chez un concurrent",
                    },
                    {
                      title: "Mentions dans les conversations",
                      description: "Quand quelqu'un vous mentionne dans une conversation",
                    },
                    {
                      title: "Rapports hebdomadaires",
                      description: "Résumé hebdomadaire de votre activité",
                    },
                  ].map((notif, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg"
                    >
                      <div>
                        <p className="text-sm font-medium text-gray-900">{notif.title}</p>
                        <p className="text-xs text-gray-600 mt-1">{notif.description}</p>
                      </div>
                      <div className="flex gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            defaultChecked
                            className="rounded border-gray-300 text-teal-600 focus:ring-teal-600"
                          />
                          <span className="text-xs text-gray-600">Email</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            defaultChecked
                            className="rounded border-gray-300 text-teal-600 focus:ring-teal-600"
                          />
                          <span className="text-xs text-gray-600">App</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Security */}
            {activeTab === "security" && (
              <>
                <Card>
                  <CardHeader>
                    <CardTitle>Mot de passe</CardTitle>
                    <CardDescription>
                      Modifiez votre mot de passe régulièrement pour plus de sécurité
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Mot de passe actuel
                      </label>
                      <Input type="password" placeholder="••••••••" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Nouveau mot de passe
                      </label>
                      <Input type="password" placeholder="••••••••" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 mb-2 block">
                        Confirmer le mot de passe
                      </label>
                      <Input type="password" placeholder="••••••••" />
                    </div>
                    <div className="flex justify-end pt-4">
                      <Button>Mettre à jour le mot de passe</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Clés API</CardTitle>
                    <CardDescription>
                      Gérez vos clés d'accès à l'API
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                        <div className="flex items-center gap-3">
                          <Key className="h-5 w-5 text-gray-400" />
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              Production API Key
                            </p>
                            <code className="text-xs text-gray-600 font-mono">
                              sk_prod_••••••••••••••••
                            </code>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm">
                            Copier
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full gap-2">
                        <Key className="h-4 w-4" />
                        Créer une nouvelle clé
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
