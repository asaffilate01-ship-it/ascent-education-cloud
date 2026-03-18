import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search } from "lucide-react";
import { motion } from "framer-motion";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25, 0.1, 0.25, 1] }}
        className="text-center max-w-md"
      >
        {/* Animated 404 */}
        <motion.div
          initial={{ scale: 0.8 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
          className="relative mb-8"
        >
          <div className="text-[120px] sm:text-[160px] font-extrabold text-primary/8 leading-none select-none">
            404
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 flex items-center justify-center">
              <Search className="w-7 h-7 text-primary/60" />
            </div>
          </div>
        </motion.div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground mb-3 tracking-tight">
          Page Not Found
        </h1>
        <p className="text-muted-foreground mb-8 text-sm sm:text-base leading-relaxed">
          The page <code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{location.pathname}</code> doesn't exist or has been moved.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/">
            <Button className="gap-2 w-full sm:w-auto">
              <ArrowLeft className="w-4 h-4" /> Back to Home
            </Button>
          </Link>
          <Link to="/login">
            <Button variant="outline" className="w-full sm:w-auto">
              Sign In
            </Button>
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default NotFound;
