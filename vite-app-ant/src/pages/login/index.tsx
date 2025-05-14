import { useLogin } from "@refinedev/core";
import { Button, Card, Form, Input, Typography } from "antd";
import { useState } from "react";
import { DebugUserSelect } from "../../components/DebugUserSelect";

const { Title } = Typography;

interface LoginFormValues {
  email: string;
  password: string;
}

export const LoginPage = () => {
  const { mutate: login } = useLogin<LoginFormValues>();
  const [form] = Form.useForm<LoginFormValues>();

  const handleUserSelect = (user: { email: string; password: string }) => {
    form.setFieldsValue({
      email: user.email,
      password: user.password,
    });
  };

  const onFinish = (values: LoginFormValues) => {
    login(values);
  };

  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        background: "#f0f2f5",
      }}
    >
      <Card
        style={{
          width: "400px",
          boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
        }}
      >
        <Title level={3} style={{ textAlign: "center", marginBottom: "24px" }}>
          ログイン
        </Title>
        <Form
          form={form}
          name="login"
          onFinish={onFinish}
          layout="vertical"
          requiredMark={false}
        >
          <Form.Item
            label="メールアドレス"
            name="email"
            rules={[
              {
                required: true,
                message: "メールアドレスを入力してください",
              },
            ]}
          >
            <Input size="large" />
          </Form.Item>
          <Form.Item
            label="パスワード"
            name="password"
            rules={[
              {
                required: true,
                message: "パスワードを入力してください",
              },
            ]}
          >
            <Input.Password size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" size="large" block>
              ログイン
            </Button>
          </Form.Item>
        </Form>
        <DebugUserSelect onUserSelect={handleUserSelect} />
      </Card>
    </div>
  );
};
