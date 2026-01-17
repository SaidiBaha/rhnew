import {type ReactNode, useEffect } from "react";
import { createPortal } from "react-dom";

export default function ModalPortal({ children }: { children: ReactNode }) {
    const modalRoot = document.getElementById("modal-root");

    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => {
            document.body.style.overflow = "";
        };
    }, []);

    if (!modalRoot) return null;

    return createPortal(children, modalRoot);
}
