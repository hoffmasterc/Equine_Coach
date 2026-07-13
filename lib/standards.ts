/**
 * Compiled position-standards reference used to ground AI analysis.
 *
 * PROVENANCE: these are plain-language summaries compiled from publicly
 * available USEA/FEI position guidance and widely-taught eventing
 * fundamentals. They are NOT verbatim rulebook text and FormSeat is not
 * affiliated with or endorsed by USEA or FEI. Every analysis point returned
 * to a user must cite one of these entries by id so claims stay traceable
 * to a fixed reference instead of the model's free-form recall.
 */

export type Phase = "dressage" | "jumping";

export interface StandardEntry {
  id: string;
  phase: Phase;
  topic: string;
  summary: string;
}

export const STANDARDS: StandardEntry[] = [
  {
    id: "dressage-vertical-alignment",
    phase: "dressage",
    topic: "Ear-Shoulder-Hip-Heel Line",
    summary:
      "In dressage, the rider's ear, shoulder, hip, and heel should form a vertical line at halt and at working gaits, with the upper body neither leaning ahead of nor behind this line. Persistent forward inclination (\"perching\") or a braced backward lean are both commonly penalized as faults in position and seat.",
  },
  {
    id: "dressage-hands",
    phase: "dressage",
    topic: "Hand Position & Rein Contact",
    summary:
      "Hands are typically carried just above and slightly in front of the withers, roughly a hand's width apart, with thumbs uppermost and a soft, elastic, unbroken line from elbow through rein to the bit. Contact should look consistent rather than fixed/rigid or loose/slack.",
  },
  {
    id: "dressage-leg",
    phase: "dressage",
    topic: "Leg Position",
    summary:
      "The lower leg is typically expected to hang close to the horse's side with the stirrup leather approximately vertical, heel no higher than the level of the toe, and the ball of the foot on the stirrup. A lower leg that has slipped forward of the girth (\"chair seat\") or swung back is a commonly noted fault.",
  },
  {
    id: "dressage-seat",
    phase: "dressage",
    topic: "Seat & Weight Distribution",
    summary:
      "The rider is expected to sit in the deepest part of the saddle with weight distributed evenly across both seat bones, pelvis level and following the horse's movement, without gripping with the thighs or knees to maintain balance.",
  },
  {
    id: "dressage-head",
    phase: "dressage",
    topic: "Head & Eye Position",
    summary:
      "The head is carried naturally erect, eyes looking up and in the direction of travel, chin level rather than tipped down or tilted to one side; looking down at the horse's neck is a common fault that tends to round the rider's upper back.",
  },
  {
    id: "dressage-back",
    phase: "dressage",
    topic: "Back & Core Posture",
    summary:
      "The rider's back should show a natural, tall posture through the core without excessive hollowing (over-arched lower back) or rounding (collapsed through the chest and shoulders); an engaged core supports an independent seat that can follow the horse's motion.",
  },
  {
    id: "jumping-two-point",
    phase: "jumping",
    topic: "Two-Point Position & Hip Angle",
    summary:
      "In the two-point/jumping position, the rider's hip angle closes and the upper body inclines forward to fold with the horse's bascule over a fence, weight dropping down into the heel through ankle, knee, and hip acting as shock absorbers rather than the rider sitting deep in the tack.",
  },
  {
    id: "jumping-release",
    phase: "jumping",
    topic: "Hand Position & Release",
    summary:
      "A crest release (hand pressed into the crest partway up the neck) or an automatic/following release is expected so the rein contact does not restrict the horse's head and neck at the fence; a short or absent release that pulls on the mouth over the fence is a commonly noted fault, especially at higher levels where an automatic release is expected.",
  },
  {
    id: "jumping-leg",
    phase: "jumping",
    topic: "Leg Position",
    summary:
      "The lower leg is expected to stay directly under the rider's body at the fence with the heel as the base of support; a lower leg that swings back (pivoting from the knee rather than weighting the heel) is a commonly noted security fault that risks a defensive position on landing.",
  },
  {
    id: "jumping-seat",
    phase: "jumping",
    topic: "Seat & Weight Distribution",
    summary:
      "The rider should be clearly out of the saddle in two-point before, during, and immediately after the fence, weight carried through the stirrups rather than sitting on the horse's back, which can restrict the horse's ability to use its back and shoulders over the jump.",
  },
  {
    id: "jumping-head",
    phase: "jumping",
    topic: "Head & Eye Position",
    summary:
      "Eyes are expected to look up and forward toward the next fence or line, not down at the current fence's rail; looking down is a very common amateur habit that tends to collapse the upper body and disrupt the line of travel.",
  },
  {
    id: "jumping-back",
    phase: "jumping",
    topic: "Back & Core Posture",
    summary:
      "The rider's back should stay flat and supported through the jumping effort, avoiding excessive rounding (collapsing) or hollow arching; a supported back helps maintain a following, secure position through takeoff, flight, and landing.",
  },
];

export function standardsForPhase(phase: Phase): StandardEntry[] {
  return STANDARDS.filter((s) => s.phase === phase);
}

export function findStandard(id: string): StandardEntry | undefined {
  return STANDARDS.find((s) => s.id === id);
}
