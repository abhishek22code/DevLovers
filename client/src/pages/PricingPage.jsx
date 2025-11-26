import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Star, Zap, Crown, ArrowRight } from 'lucide-react';
import Navigation from '../components/Navigation';
import styles from '../styles/PricingPage.module.css';

const PricingPage = () => {
  const [isAnnual, setIsAnnual] = useState(false);

  const pricingPlans = [
    {
      id: 'free',
      name: 'Free',
      description: 'Perfect for getting started',
      price: { monthly: 0, annual: 0 },
      features: [
        'Up to 5 posts per day',
        'Basic profile customization',
        'Community access',
        'Basic support'
      ],
      buttonText: 'Get Started',
      buttonVariant: 'outline',
      popular: false,
      icon: Star
    },
    {
      id: 'pro',
      name: 'Pro',
      description: 'For serious developers',
      price: { monthly: 19, annual: 190 },
      features: [
        'Unlimited posts',
        'Advanced profile customization',
        'Priority support',
        'Analytics dashboard',
        'Custom themes',
        'API access'
      ],
      buttonText: 'Start Pro Trial',
      buttonVariant: 'primary',
      popular: true,
      icon: Zap
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      description: 'For teams and organizations',
      price: { monthly: 49, annual: 490 },
      features: [
        'Everything in Pro',
        'Team collaboration tools',
        'Advanced analytics',
        'Custom integrations',
        'Dedicated support',
        'White-label options'
      ],
      buttonText: 'Contact Sales',
      buttonVariant: 'outline',
      popular: false,
      icon: Crown
    }
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: { duration: 0.6 }
    }
  };

  return (
    <div className={styles.container}>
      <Navigation />
      
      <div className={styles.content}>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className={styles.header}
        >
          <motion.div variants={itemVariants} className={styles.headerTitleContainer}>
            <h1 className={styles.headerTitle}>
              Choose Your <span className={styles.headerTitleHighlight}>Plan</span>
            </h1>
            <p className={styles.headerSubtitle}>
              Join thousands of developers who are already building amazing things together
            </p>
          </motion.div>

          {/* Billing Toggle */}
          <motion.div variants={itemVariants} className={styles.billingToggle}>
            <span className={`${styles.billingLabel} ${!isAnnual ? styles.billingLabelActive : styles.billingLabelInactive}`}>
              Monthly
            </span>
            <button
              onClick={() => setIsAnnual(!isAnnual)}
              className={`${styles.billingSwitch} ${isAnnual ? styles.billingSwitchActive : styles.billingSwitchInactive}`}
            >
              <span className={`${styles.billingSwitchThumb} ${isAnnual ? styles.billingSwitchThumbActive : styles.billingSwitchThumbInactive}`} />
            </button>
            <span className={`${styles.billingLabel} ${isAnnual ? styles.billingLabelActive : styles.billingLabelInactive}`}>
              Annual
            </span>
            {isAnnual && (
              <span className={styles.billingSavings}>
                Save 20%
              </span>
            )}
          </motion.div>
        </motion.div>

        {/* Pricing Cards */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className={styles.cards}
        >
          {pricingPlans.map((plan, index) => {
            const Icon = plan.icon;
            const isMiddle = index === 1;
            
            return (
              <motion.div
                key={plan.id}
                variants={itemVariants}
                className={`${styles.card} ${isMiddle ? styles.cardFeatured : styles.cardRegular}`}
              >
                {plan.popular && (
                  <div className={styles.cardBadge}>
                    <span className={styles.cardBadgeText}>
                      Most Popular
                    </span>
                  </div>
                )}

                <div className={styles.cardHeader}>
                  <div className={`${styles.cardIcon} ${isMiddle ? styles.cardIconFeatured : styles.cardIconRegular}`}>
                    <Icon className={styles.cardIconSvg} />
                  </div>
                  <h3 className={styles.cardTitle}>{plan.name}</h3>
                  <p className={styles.cardDescription}>{plan.description}</p>
                </div>

                <div className={styles.cardPricing}>
                  <div className={styles.cardPriceContainer}>
                    <span className={styles.cardPrice}>
                      ${isAnnual ? plan.price.annual : plan.price.monthly}
                    </span>
                    {plan.price.monthly > 0 && (
                      <span className={styles.cardPricePeriod}>
                        /{isAnnual ? 'year' : 'month'}
                      </span>
                    )}
                  </div>
                  {isAnnual && plan.price.monthly > 0 && (
                    <p className={styles.cardPriceNote}>
                      ${Math.round(plan.price.annual / 12)}/month billed annually
                    </p>
                  )}
                </div>

                <ul className={styles.cardFeatures}>
                  {plan.features.map((feature, featureIndex) => (
                    <li key={featureIndex} className={styles.cardFeature}>
                      <Check className={`${styles.cardFeatureIcon} ${isMiddle ? styles.cardFeatureIconFeatured : styles.cardFeatureIconRegular}`} />
                      <span className={styles.cardFeatureText}>{feature}</span>
                    </li>
                  ))}
                </ul>

                <button
                  className={`${styles.cardButton} ${
                    plan.buttonVariant === 'primary'
                      ? styles.cardButtonPrimary
                      : styles.cardButtonOutline
                  }`}
                >
                  {plan.buttonText}
                  <ArrowRight className={styles.cardButtonIcon} />
                </button>
              </motion.div>
            );
          })}
        </motion.div>

        {/* FAQ Section */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className={styles.faq}
        >
          <h2 className={styles.faqTitle}>
            Frequently Asked Questions
          </h2>
          <div className={styles.faqGrid}>
            <div className={styles.faqItem}>
              <h3 className={styles.faqItemTitle}>
                Can I change plans anytime?
              </h3>
              <p className={styles.faqItemText}>
                Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.
              </p>
            </div>
            <div className={styles.faqItem}>
              <h3 className={styles.faqItemTitle}>
                Is there a free trial?
              </h3>
              <p className={styles.faqItemText}>
                Yes, all paid plans come with a 14-day free trial. No credit card required.
              </p>
            </div>
            <div className={styles.faqItem}>
              <h3 className={styles.faqItemTitle}>
                What payment methods do you accept?
              </h3>
              <p className={styles.faqItemText}>
                We accept all major credit cards, PayPal, and bank transfers for annual plans.
              </p>
            </div>
            <div className={styles.faqItem}>
              <h3 className={styles.faqItemTitle}>
                Do you offer refunds?
              </h3>
              <p className={styles.faqItemText}>
                Yes, we offer a 30-day money-back guarantee for all paid plans.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default PricingPage;



