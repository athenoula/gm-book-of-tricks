import { useState, useEffect } from 'react'
import { Link } from '@tanstack/react-router'
import { Button } from '@/components/ui/Button'
import { ChipSelect } from '@/components/ui/ChipSelect'
import { GameIcon } from '@/components/ui/GameIcon'
import { GiChatBubble, GiCastle } from '@/components/ui/icons'
import { FadeIn } from '@/components/motion'
import { useFeedbackResponse, useDetectedFeatures, useSaveFeedbackStep, useSubmitFeedback } from './useFeedback'
import {
  FEEDBACK_ROLES,
  FEEDBACK_EXPERIENCE,
  FEEDBACK_SYSTEMS,
  FEEDBACK_FREQUENCY,
  FEEDBACK_WANTED_FEATURES,
  FEEDBACK_OTHER_TOOLS,
  FEEDBACK_PAID_TOOLS,
  FEEDBACK_MONTHLY_SPEND,
  FEEDBACK_FAIR_PRICE,
} from '@/lib/types'
import type {
  FeedbackStep1,
  FeedbackStep2,
  FeedbackStep3,
  FeedbackStep4,
} from '@/lib/types'

const STEP_LABELS = ['About You', 'Your Experience', "What's Missing", 'D&D Spending']

export function FeedbackWizardPage() {
  const { data: existing, isLoading } = useFeedbackResponse()
  const saveFeedbackStep = useSaveFeedbackStep()
  const submitFeedback = useSubmitFeedback()

  const [step, setStep] = useState(1)
  const [submitted, setSubmitted] = useState(false)

  // Step 1 state
  const [role, setRole] = useState('')
  const [experience, setExperience] = useState('')
  const [systems, setSystems] = useState<string[]>([])
  const [systemOther, setSystemOther] = useState('')
  const [frequency, setFrequency] = useState('')

  // Step 2 state
  const [ratings, setRatings] = useState<Record<string, 'meh' | 'good' | 'love'>>({})
  const [bestThing, setBestThing] = useState('')
  const [worstThing, setWorstThing] = useState('')

  // Step 3 state
  const [wantedFeatures, setWantedFeatures] = useState<string[]>([])
  const [topWish, setTopWish] = useState('')
  const [otherTools, setOtherTools] = useState<string[]>([])
  const [otherToolText, setOtherToolText] = useState('')

  // Step 4 state
  const [paidTools, setPaidTools] = useState<string[]>([])
  const [paidToolOther, setPaidToolOther] = useState('')
  const [monthlySpend, setMonthlySpend] = useState('')
  const [fairPrice, setFairPrice] = useState('')
  const [anythingElse, setAnythingElse] = useState('')

  // Restore from existing response
  useEffect(() => {
    if (!existing) return
    if (existing.completed) {
      setSubmitted(true)
      return
    }
    setStep(existing.current_step)
    if (existing.step1) {
      setRole(existing.step1.role)
      setExperience(existing.step1.experience)
      setSystems(existing.step1.systems.filter((s) => ![...FEEDBACK_SYSTEMS].includes(s as typeof FEEDBACK_SYSTEMS[number]) ? false : true))
      const otherSys = existing.step1.systems.find((s) => ![...FEEDBACK_SYSTEMS].includes(s as typeof FEEDBACK_SYSTEMS[number]))
      if (otherSys) { setSystems((prev) => [...prev, 'Other']); setSystemOther(otherSys) }
      setFrequency(existing.step1.frequency)
    }
    if (existing.step2) {
      setRatings(existing.step2.ratings)
      setBestThing(existing.step2.best_thing)
      setWorstThing(existing.step2.worst_thing)
    }
    if (existing.step3) {
      setWantedFeatures(existing.step3.wanted_features)
      setTopWish(existing.step3.top_wish)
      setOtherTools(existing.step3.other_tools.filter((t) => ![...FEEDBACK_OTHER_TOOLS].includes(t as typeof FEEDBACK_OTHER_TOOLS[number]) ? false : true))
      const otherTool = existing.step3.other_tools.find((t) => ![...FEEDBACK_OTHER_TOOLS].includes(t as typeof FEEDBACK_OTHER_TOOLS[number]))
      if (otherTool) { setOtherTools((prev) => [...prev, 'Other']); setOtherToolText(otherTool) }
    }
    if (existing.step4) {
      setPaidTools(existing.step4.paid_tools.filter((t) => ![...FEEDBACK_PAID_TOOLS].includes(t as typeof FEEDBACK_PAID_TOOLS[number]) ? false : true))
      const otherPaid = existing.step4.paid_tools.find((t) => ![...FEEDBACK_PAID_TOOLS].includes(t as typeof FEEDBACK_PAID_TOOLS[number]))
      if (otherPaid) { setPaidTools((prev) => [...prev, 'Other']); setPaidToolOther(otherPaid) }
      setMonthlySpend(existing.step4.monthly_spend)
      setFairPrice(existing.step4.fair_price)
      setAnythingElse(existing.step4.anything_else)
    }
  }, [existing])

  const buildStep1 = (): FeedbackStep1 => {
    const finalSystems = systems.filter((s) => s !== 'Other')
    if (systems.includes('Other') && systemOther.trim()) finalSystems.push(systemOther.trim())
    return { role, experience, systems: finalSystems, frequency }
  }

  const handleNext = async () => {
    if (step === 1) {
      await saveFeedbackStep.mutateAsync({ step: 'step1', data: buildStep1(), currentStep: 2 })
      setStep(2)
    } else if (step === 2) {
      const step2Data: FeedbackStep2 = { detected_features: detectedFeatures || [], ratings, best_thing: bestThing, worst_thing: worstThing }
      await saveFeedbackStep.mutateAsync({ step: 'step2', data: step2Data, currentStep: 3 })
      setStep(3)
    } else if (step === 3) {
      const finalTools = otherTools.filter((t) => t !== 'Other')
      if (otherTools.includes('Other') && otherToolText.trim()) finalTools.push(otherToolText.trim())
      const step3Data: FeedbackStep3 = { wanted_features: wantedFeatures, top_wish: topWish, other_tools: finalTools }
      await saveFeedbackStep.mutateAsync({ step: 'step3', data: step3Data, currentStep: 4 })
      setStep(4)
    } else if (step === 4) {
      const finalPaid = paidTools.filter((t) => t !== 'Other')
      if (paidTools.includes('Other') && paidToolOther.trim()) finalPaid.push(paidToolOther.trim())
      const step4Data: FeedbackStep4 = { paid_tools: finalPaid, monthly_spend: monthlySpend, fair_price: fairPrice, anything_else: anythingElse }
      await submitFeedback.mutateAsync({ step4: step4Data })
      setSubmitted(true)
    }
  }

  const { data: detectedFeatures } = useDetectedFeatures()

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-bg-deep flex items-center justify-center">
        <div className="text-3xl torch-flicker"><GameIcon icon={GiChatBubble} size="3xl" /></div>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-dvh bg-bg-deep">
        <header className="border-b border-border px-6 py-4 flex items-center justify-between">
          <h1 className="text-xl gold-foil">GM Book of Tricks</h1>
          <Link to="/home" className="text-text-muted hover:text-text-body text-sm">
            <GameIcon icon={GiCastle} size="base" /> Back to campaigns
          </Link>
        </header>
        <main className="max-w-2xl mx-auto px-4 py-16 text-center">
          <FadeIn>
            <div className="bg-primary-ghost/30 border border-primary/20 rounded-[--radius-xl] p-8">
              <h2 className="text-2xl mb-2 gold-foil">Thank you for helping shape Book of Tricks.</h2>
              <p className="text-text-secondary">
                As a beta tester, you'll always have free access — no subscription needed, ever. We mean it.
              </p>
              <div className="mt-6">
                <Link to="/home">
                  <Button variant="secondary">Back to campaigns</Button>
                </Link>
              </div>
            </div>
          </FadeIn>
        </main>
      </div>
    )
  }

  const isStepValid = () => {
    if (step === 1) return role && experience && systems.length > 0 && frequency
    if (step === 2) return true
    if (step === 3) return true
    if (step === 4) return monthlySpend && fairPrice
    return false
  }

  return (
    <div className="min-h-dvh bg-bg-deep">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl gold-foil">GM Book of Tricks</h1>
        <Link to="/home" className="text-text-muted hover:text-text-body text-sm flex items-center gap-1">
          <GameIcon icon={GiCastle} size="base" /> Back to campaigns
        </Link>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8 md:px-8">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex justify-between mb-2 text-sm">
            {STEP_LABELS.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => i + 1 < step && setStep(i + 1)}
                className={`
                  transition-colors cursor-pointer
                  ${i + 1 === step ? 'text-primary-light font-medium' : ''}
                  ${i + 1 < step ? 'text-text-secondary hover:text-text-body' : ''}
                  ${i + 1 > step ? 'text-text-muted' : ''}
                `}
                disabled={i + 1 > step}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="h-1.5 bg-bg-raised rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-primary to-primary-light rounded-full transition-all duration-500"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

        <FadeIn key={step}>
          {step === 1 && (
            <Step1AboutYou
              role={role} setRole={setRole}
              experience={experience} setExperience={setExperience}
              systems={systems} setSystems={setSystems}
              systemOther={systemOther} setSystemOther={setSystemOther}
              frequency={frequency} setFrequency={setFrequency}
            />
          )}
          {step === 2 && (
            <Step2Experience
              detectedFeatures={detectedFeatures || []}
              ratings={ratings} setRatings={setRatings}
              bestThing={bestThing} setBestThing={setBestThing}
              worstThing={worstThing} setWorstThing={setWorstThing}
            />
          )}
          {step === 3 && (
            <Step3Missing
              wantedFeatures={wantedFeatures} setWantedFeatures={setWantedFeatures}
              topWish={topWish} setTopWish={setTopWish}
              otherTools={otherTools} setOtherTools={setOtherTools}
              otherToolText={otherToolText} setOtherToolText={setOtherToolText}
            />
          )}
          {step === 4 && (
            <Step4Spending
              paidTools={paidTools} setPaidTools={setPaidTools}
              paidToolOther={paidToolOther} setPaidToolOther={setPaidToolOther}
              monthlySpend={monthlySpend} setMonthlySpend={setMonthlySpend}
              fairPrice={fairPrice} setFairPrice={setFairPrice}
              anythingElse={anythingElse} setAnythingElse={setAnythingElse}
            />
          )}
        </FadeIn>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <Button
            variant="ghost"
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 1}
          >
            Back
          </Button>
          <Button
            onClick={handleNext}
            disabled={!isStepValid() || saveFeedbackStep.isPending || submitFeedback.isPending}
          >
            {step === 4 ? 'Submit' : 'Next'}
          </Button>
        </div>
      </main>
    </div>
  )
}

// =============================================
// Step Components
// =============================================

function Step1AboutYou({
  role, setRole, experience, setExperience,
  systems, setSystems, systemOther, setSystemOther,
  frequency, setFrequency,
}: {
  role: string; setRole: (v: string) => void
  experience: string; setExperience: (v: string) => void
  systems: string[]; setSystems: (v: string[]) => void
  systemOther: string; setSystemOther: (v: string) => void
  frequency: string; setFrequency: (v: string) => void
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl mb-1 gold-foil">Welcome, adventurer.</h2>
        <p className="text-text-secondary text-sm">
          Your feedback shapes what we build next. Beta testers will always have free access — this is your tool too.
        </p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm text-text-secondary font-medium">What best describes your role?</label>
        <ChipSelect options={FEEDBACK_ROLES} selected={role} onChange={(v) => setRole(v as string)} />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm text-text-secondary font-medium">How long have you been running games?</label>
        <ChipSelect options={FEEDBACK_EXPERIENCE} selected={experience} onChange={(v) => setExperience(v as string)} />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm text-text-secondary font-medium">
          What systems do you play? <span className="text-text-muted">(select all that apply)</span>
        </label>
        <ChipSelect
          options={FEEDBACK_SYSTEMS}
          selected={systems}
          onChange={(v) => setSystems(v as string[])}
          multiple
          allowOther
          otherValue={systemOther}
          onOtherChange={setSystemOther}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm text-text-secondary font-medium">How often do you run sessions?</label>
        <ChipSelect options={FEEDBACK_FREQUENCY} selected={frequency} onChange={(v) => setFrequency(v as string)} />
      </div>
    </div>
  )
}

function Step2Experience({
  detectedFeatures, ratings, setRatings,
  bestThing, setBestThing, worstThing, setWorstThing,
}: {
  detectedFeatures: { name: string; count: number }[]
  ratings: Record<string, 'meh' | 'good' | 'love'>
  setRatings: (v: Record<string, 'meh' | 'good' | 'love'>) => void
  bestThing: string; setBestThing: (v: string) => void
  worstThing: string; setWorstThing: (v: string) => void
}) {
  const ratingOptions: { value: 'meh' | 'good' | 'love'; label: string }[] = [
    { value: 'meh', label: '😐' },
    { value: 'good', label: '🙂' },
    { value: 'love', label: '🤩' },
  ]

  return (
    <div className="space-y-6">
      <h2 className="text-2xl gold-foil">Your Experience</h2>

      {detectedFeatures.length > 0 && (
        <div className="bg-primary-ghost/30 border border-primary/20 rounded-[--radius-lg] p-4">
          <p className="text-xs uppercase tracking-wider text-primary-light mb-2 font-medium">Features you've used</p>
          <div className="flex flex-wrap gap-2">
            {detectedFeatures.map((f) => (
              <span key={f.name} className="px-2.5 py-1 bg-primary-ghost border border-primary/30 rounded-[--radius-sm] text-primary-light text-sm">
                {f.name} ({f.count})
              </span>
            ))}
          </div>
          <p className="text-xs text-text-muted mt-2">Auto-detected from your account — not everything? No worries, just rate what you've tried.</p>
        </div>
      )}

      {detectedFeatures.length > 0 && (
        <div className="space-y-2">
          <label className="text-sm text-text-secondary font-medium">Rate the features you've used</label>
          {detectedFeatures.map((feature) => (
            <div key={feature.name} className="flex items-center justify-between bg-bg-raised rounded-[--radius-md] px-3 py-2">
              <span className="text-sm text-text-body">{feature.name}</span>
              <div className="flex gap-1">
                {ratingOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRatings({ ...ratings, [feature.name]: opt.value })}
                    className={`
                      w-8 h-8 flex items-center justify-center rounded-[--radius-sm] text-sm cursor-pointer transition-colors
                      ${ratings[feature.name] === opt.value
                        ? 'bg-primary-ghost border border-primary text-primary-light'
                        : 'border border-border text-text-muted hover:border-border-hover'
                      }
                    `}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm text-text-secondary font-medium">What's the best thing about Book of Tricks so far?</label>
        <textarea
          value={bestThing}
          onChange={(e) => setBestThing(e.target.value)}
          placeholder="Optional — a sentence or two is great"
          rows={3}
          className="w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body placeholder:text-text-muted focus:outline-none focus:border-border-active focus:ring-1 focus:ring-primary/30 transition-colors duration-[--duration-fast] text-sm resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm text-text-secondary font-medium">What's the most frustrating thing?</label>
        <textarea
          value={worstThing}
          onChange={(e) => setWorstThing(e.target.value)}
          placeholder="Optional — bugs, confusing UX, missing stuff, anything"
          rows={3}
          className="w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body placeholder:text-text-muted focus:outline-none focus:border-border-active focus:ring-1 focus:ring-primary/30 transition-colors duration-[--duration-fast] text-sm resize-none"
        />
      </div>
    </div>
  )
}

function Step3Missing({
  wantedFeatures, setWantedFeatures,
  topWish, setTopWish,
  otherTools, setOtherTools,
  otherToolText, setOtherToolText,
}: {
  wantedFeatures: string[]; setWantedFeatures: (v: string[]) => void
  topWish: string; setTopWish: (v: string) => void
  otherTools: string[]; setOtherTools: (v: string[]) => void
  otherToolText: string; setOtherToolText: (v: string) => void
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl gold-foil">What Would Make This Your Go-To Tool?</h2>

      <div className="space-y-1.5">
        <label className="text-sm text-text-secondary font-medium">
          Which of these would you actually use? <span className="text-text-muted">(select all that apply)</span>
        </label>
        <p className="text-xs text-text-muted">These are features we're considering — your picks help us prioritize.</p>
        <ChipSelect options={FEEDBACK_WANTED_FEATURES} selected={wantedFeatures} onChange={(v) => setWantedFeatures(v as string[])} multiple />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm text-text-secondary font-medium">If you could add ONE feature right now, what would it be?</label>
        <textarea
          value={topWish}
          onChange={(e) => setTopWish(e.target.value)}
          placeholder="Your #1 wish — doesn't have to be from the list above"
          rows={2}
          className="w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body placeholder:text-text-muted focus:outline-none focus:border-border-active focus:ring-1 focus:ring-primary/30 transition-colors duration-[--duration-fast] text-sm resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm text-text-secondary font-medium">What do you currently use outside Book of Tricks for session prep?</label>
        <ChipSelect
          options={FEEDBACK_OTHER_TOOLS}
          selected={otherTools}
          onChange={(v) => setOtherTools(v as string[])}
          multiple
          allowOther
          otherValue={otherToolText}
          onOtherChange={setOtherToolText}
        />
      </div>
    </div>
  )
}

function Step4Spending({
  paidTools, setPaidTools, paidToolOther, setPaidToolOther,
  monthlySpend, setMonthlySpend,
  fairPrice, setFairPrice,
  anythingElse, setAnythingElse,
}: {
  paidTools: string[]; setPaidTools: (v: string[]) => void
  paidToolOther: string; setPaidToolOther: (v: string) => void
  monthlySpend: string; setMonthlySpend: (v: string) => void
  fairPrice: string; setFairPrice: (v: string) => void
  anythingElse: string; setAnythingElse: (v: string) => void
}) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl gold-foil">D&D Tools & Spending</h2>

      <div className="space-y-1.5">
        <label className="text-sm text-text-secondary font-medium">
          What D&D tools or services do you currently pay for? <span className="text-text-muted">(select all that apply)</span>
        </label>
        <ChipSelect
          options={FEEDBACK_PAID_TOOLS}
          selected={paidTools}
          onChange={(v) => setPaidTools(v as string[])}
          multiple
          allowOther
          otherValue={paidToolOther}
          onOtherChange={setPaidToolOther}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm text-text-secondary font-medium">Roughly how much do you spend per month on TTRPG tools/content?</label>
        <ChipSelect options={FEEDBACK_MONTHLY_SPEND} selected={monthlySpend} onChange={(v) => setMonthlySpend(v as string)} />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm text-text-secondary font-medium">If Book of Tricks had everything you needed, what would feel like a fair monthly price?</label>
        <ChipSelect options={FEEDBACK_FAIR_PRICE} selected={fairPrice} onChange={(v) => setFairPrice(v as string)} />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm text-text-secondary font-medium">Anything else you'd like us to know?</label>
        <textarea
          value={anythingElse}
          onChange={(e) => setAnythingElse(e.target.value)}
          placeholder="Optional — wild ideas, complaints, encouragement, all welcome"
          rows={3}
          className="w-full px-3 py-2 rounded-[--radius-md] bg-bg-raised border border-border text-text-body placeholder:text-text-muted focus:outline-none focus:border-border-active focus:ring-1 focus:ring-primary/30 transition-colors duration-[--duration-fast] text-sm resize-none"
        />
      </div>
    </div>
  )
}
